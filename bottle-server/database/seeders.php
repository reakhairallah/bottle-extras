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

    $sql = "INSERT INTO users(token, display_name) VALUES(?, ?)";
    $query = $mysql->prepare($sql);
    $query->bind_param("ss", $token, $display_name);
    $query->execute();

    $user_ids[] = $mysql->insert_id;
}


// ---------- 2. BOTTLES ----------
// one bottle per entry in $bottles (from factories.php), each with a
// random author and a random past timestamp (1 to 30 days ago), so the
// data looks like it built up over time
$bottle_ids = [];
$bottle_authors = [];
$bottle_created_at = [];
$bottle_marks = [];

foreach($bottles as $bottle_data){
    $author_id = $user_ids[rand(0, count($user_ids) - 1)];
    $content = $bottle_data["content"];

    $days_ago = rand(1, 30);
    $hours_ago = rand(0, 23);
    $created_at = date("Y-m-d H:i:s", strtotime("-$days_ago days -$hours_ago hours"));

    $sql = "INSERT INTO bottles(author_id, content, created_at) VALUES(?, ?, ?)";
    $query = $mysql->prepare($sql);
    $query->bind_param("iss", $author_id, $content, $created_at);
    $query->execute();

    $bottle_id = $mysql->insert_id;
    $bottle_ids[] = $bottle_id;
    $bottle_authors[$bottle_id] = $author_id;
    $bottle_created_at[$bottle_id] = $created_at;
    $bottle_marks[$bottle_id] = $bottle_data["marks"];
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
    // the first N guarantees no duplicate user, same rule as mark.php)
    shuffle($eligible_users);
    $marks_for_this_bottle = $bottle_marks[$bottle_id];
    for($m = 0; $m < count($marks_for_this_bottle); $m++){
        $marker_id = $eligible_users[$m];
        $mark_content = $marks_for_this_bottle[$m];

        $sql = "INSERT INTO marks(bottle_id, user_id, content) VALUES(?, ?, ?)";
        $query = $mysql->prepare($sql);
        $query->bind_param("iis", $bottle_id, $marker_id, $mark_content);
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

// report.php normally flips is_active itself once the 3rd report lands -
// since we're inserting directly into the database, we have to do that
// last step ourselves here too
$sql = "UPDATE bottles SET is_active = 0 WHERE id = ?";
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
