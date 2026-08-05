<?php

include("connection.php");
include("factories.php");

// ---------- 1. USERS ----------
// same generation style as token.php, just done 40 times in a row
$user_ids = [];

for($i = 0; $i < 40; $i++){
    $token = bin2hex(random_bytes(32));
    $adjective = $adjectives[rand(0, count($adjectives) - 1)];
    $noun = $nouns[rand(0, count($nouns) - 1)];
    $display_name = $adjective . $noun . rand(1, 99);

    $seed = mt_rand(1, 2147483647);

    $sql = "INSERT INTO users(token, display_name, seed) VALUES(?, ?, ?)";
    $query = $mysql->prepare($sql);
    $query->bind_param("ssi", $token, $display_name, $seed);
    $query->execute();

    $user_ids[] = $mysql->insert_id;
}


// ---------- 2. BOTTLES ----------
// one bottle per entry in $bottles (from factories.php), each with a
// random author and a backdated timestamp so the data looks like it
// built up over time.
//
// Ages are drawn from 5 buckets ("scenarios") instead of one flat
// rand(1,30) range, and every bottle gets shuffled into one of them.
// That spread matters for the 30-day-no-mark retirement rule: without
// it, every bottle's neglect clock would look identical and there'd be
// no way to see retirement trigger without literally waiting a month.
// "created" is the bottle's age bucket; "mark" is the age bucket its
// LAST mark should land in (used in section 3 below) - kept a bit
// younger than "created" since a mark can only happen after the bottle
// was thrown.
$scenarios = [
    0 => ["created" => [0, 2],   "mark" => [0, 2]],   // fresh: thrown/marked today or yesterday
    1 => ["created" => [3, 10],  "mark" => [1, 6]],    // recent: within the last week or so
    2 => ["created" => [11, 24], "mark" => [5, 16]],   // aging: comfortably mid-cycle
    3 => ["created" => [25, 29], "mark" => [18, 28]],  // near the 30-day threshold, not there yet
    4 => ["created" => [32, 45], "mark" => [31, 40]],  // already past 30 days - neglected on sight
];

// build one scenario id per bottle (cycling 0-4 then shuffled) so the
// buckets stay roughly evenly represented instead of leaving it to
// chance
$scenario_ids = [];
for($i = 0; $i < count($bottles); $i++){
    $scenario_ids[] = $i % count($scenarios);
}
shuffle($scenario_ids);

$bottle_ids = [];
$bottle_authors = [];
$bottle_created_at = [];
$bottle_marks = [];
$bottle_scenarios = [];

foreach($bottles as $index => $bottle_data){
    $author_id = $user_ids[rand(0, count($user_ids) - 1)];
    $content = $bottle_data["content"];
    $scenario = $scenarios[$scenario_ids[$index]];

    $days_ago = rand($scenario["created"][0], $scenario["created"][1]);
    $hours_ago = rand(0, 23);
    $created_at = date("Y-m-d H:i:s", strtotime("-$days_ago days -$hours_ago hours"));
    $seed = mt_rand(1, 2147483647);

    $sql = "INSERT INTO bottles(author_id, content, created_at, seed) VALUES(?, ?, ?, ?)";
    $query = $mysql->prepare($sql);
    $query->bind_param("issi", $author_id, $content, $created_at, $seed);
    $query->execute();

    $bottle_id = $mysql->insert_id;
    $bottle_ids[] = $bottle_id;
    $bottle_authors[$bottle_id] = $author_id;
    $bottle_created_at[$bottle_id] = $created_at;
    $bottle_marks[$bottle_id] = $bottle_data["marks"];
    $bottle_scenarios[$bottle_id] = $scenario;
}


// ---------- 3. MARKS + HOLDS ----------
// for every bottle, figure out who's allowed to interact with it
// (everyone except its own author), then attach that bottle's OWN
// marks (from factories.php) and hand out a random number of holds
foreach($bottle_ids as $bottle_id){
    $author_id = $bottle_authors[$bottle_id];

    $eligible_users = [];
    foreach($user_ids as $uid){
        if($uid != $author_id){
            $eligible_users[] = $uid;
        }
    }

    // marks: whatever this specific bottle has in factories.php, each
    // one posted by a different random eligible user (shuffle + take
    // the first N guarantees no duplicate user, same rule as mark.php),
    // backdated so the LAST mark lands inside this bottle's scenario
    // bucket and earlier marks (if any) fall between the bottle's
    // created_at and that last-mark date, oldest first.
    //
    // everything below works in raw unix timestamps (seconds), not
    // separate "days ago" + "hours ago" pieces - picking those
    // independently can let a mark's random hour land earlier in the
    // day than the bottle's own random creation hour, backdating the
    // mark to before the bottle even exists
    shuffle($eligible_users);
    $marks_for_this_bottle = $bottle_marks[$bottle_id];
    $mark_count = count($marks_for_this_bottle);
    $scenario = $bottle_scenarios[$bottle_id];
    $bottle_created_ts = strtotime($bottle_created_at[$bottle_id]);
    $now_ts = time();
    $age_days = intdiv($now_ts - $bottle_created_ts, 86400);

    // clip the scenario's mark bucket to the bottle's actual age - a
    // mark can never be older than the bottle itself
    $mark_min_days = min($scenario["mark"][0], $age_days);
    $mark_max_days = min($scenario["mark"][1], $age_days);
    if($mark_min_days > $mark_max_days){
        $mark_min_days = $mark_max_days;
    }

    // convert that day bucket into a timestamp range, then clamp it
    // inside the bottle's actual lifetime (created_at..now) so rounding
    // at the day boundary can never push it outside
    $last_mark_min_ts = max($bottle_created_ts, $now_ts - $mark_max_days * 86400);
    $last_mark_max_ts = min($now_ts, $now_ts - $mark_min_days * 86400);
    if($last_mark_min_ts > $last_mark_max_ts){
        $last_mark_min_ts = $last_mark_max_ts;
    }
    $last_mark_ts = rand($last_mark_min_ts, $last_mark_max_ts);
    $last_mark_ts = max($last_mark_ts, $bottle_created_ts + 1);

    $last_mark_at = null;
    for($m = 0; $m < $mark_count; $m++){
        $marker_id = $eligible_users[$m];
        $mark_content = $marks_for_this_bottle[$m];

        // linearly interpolate from just after the bottle's created_at
        // up to last_mark_ts, so earlier marks read as older than later
        // ones and the final mark lands exactly on last_mark_ts - pure
        // timestamp math, so it can never fall before created_at
        $mark_ts = round($bottle_created_ts + ($last_mark_ts - $bottle_created_ts) * ($m + 1) / $mark_count);
        $mark_created_at = date("Y-m-d H:i:s", $mark_ts);
        $last_mark_at = $mark_created_at;

        $sql = "INSERT INTO marks(bottle_id, user_id, content, created_at) VALUES(?, ?, ?, ?)";
        $query = $mysql->prepare($sql);
        $query->bind_param("iiss", $bottle_id, $marker_id, $mark_content, $mark_created_at);
        $query->execute();
    }

    // last_mark_at: same value just written to marks.created_at for
    // this bottle's final mark, or NULL if it has no marks at all -
    // mirrors what mark.php maintains at write-time
    if($last_mark_at !== null){
        $sql = "UPDATE bottles SET last_mark_at = ? WHERE id = ?";
        $query = $mysql->prepare($sql);
        $query->bind_param("si", $last_mark_at, $bottle_id);
        $query->execute();
    }

    // holds: 0 to 6, from distinct users, drawn_at randomly picked
    // between when the bottle was thrown and right now
    shuffle($eligible_users);
    $hold_count = rand(0, 6);
    $bottle_time = strtotime($bottle_created_at[$bottle_id]);
    $now_time = time();

    for($h = 0; $h < $hold_count && $h < count($eligible_users); $h++){
        $holder_id = $eligible_users[$h];
        $drawn_at = date("Y-m-d H:i:s", rand($bottle_time, $now_time));

        $sql = "INSERT INTO holds(bottle_id, user_id, drawn_at) VALUES(?, ?, ?)";
        $query = $mysql->prepare($sql);
        $query->bind_param("iis", $bottle_id, $holder_id, $drawn_at);
        $query->execute();
    }
}


// ---------- 4. REPORTS ----------
// pick one bottle to fully demonstrate the "3 reports = removed" rule,
// and a handful of others to show partial reports that DON'T remove it
shuffle($bottle_ids);
$removed_bottle_id = $bottle_ids[0];
$partially_reported_ids = array_slice($bottle_ids, 1, 5);

// the fully-reported bottle: 3 reports from 3 different users
$author_id = $bottle_authors[$removed_bottle_id];
$eligible_users = [];
foreach($user_ids as $uid){
    if($uid != $author_id){
        $eligible_users[] = $uid;
    }
}
shuffle($eligible_users);

for($r = 0; $r < 3; $r++){
    $reporter_id = $eligible_users[$r];
    $sql = "INSERT INTO reports(bottle_id, user_id) VALUES(?, ?)";
    $query = $mysql->prepare($sql);
    $query->bind_param("ii", $removed_bottle_id, $reporter_id);
    $query->execute();
}

// report.php normally flips is_active/retirement_reason itself once
// the 3rd report lands - since we're inserting directly into the
// database, we have to do that last step ourselves here too
$sql = "UPDATE bottles SET is_active = 0, retirement_reason = 'reported' WHERE id = ?";
$query = $mysql->prepare($sql);
$query->bind_param("i", $removed_bottle_id);
$query->execute();

// the partially-reported bottles: 1 or 2 reports each, still active
foreach($partially_reported_ids as $bottle_id){
    $author_id = $bottle_authors[$bottle_id];
    $eligible_users = [];
    foreach($user_ids as $uid){
        if($uid != $author_id){
            $eligible_users[] = $uid;
        }
    }
    shuffle($eligible_users);

    $report_count = rand(1, 2);
    for($r = 0; $r < $report_count; $r++){
        $reporter_id = $eligible_users[$r];
        $sql = "INSERT INTO reports(bottle_id, user_id) VALUES(?, ?)";
        $query = $mysql->prepare($sql);
        $query->bind_param("ii", $bottle_id, $reporter_id);
        $query->execute();
    }
}

echo "Seeded 40 users and 50 bottles, with marks, holds, and reports scattered across them.";

?>
