<?php

include("database/token.php");
include("database/retirement.php");
include("database/position.php");

$user_id = $current_user["id"];

$sql = "SELECT COUNT(*) AS total FROM bottles WHERE author_id = ? AND created_at >= CURDATE()";
$query = $mysql->prepare($sql);
$query->bind_param("i", $user_id);
$query->execute();
$array = $query->get_result();
$row = $array->fetch_assoc();

if($row["total"] == 0){
    $response = [];
    $response["success"] = false;
    $response["message"] = "Throw a bottle first!";
    echo json_encode($response);
    exit;
}

$sql = "SELECT COUNT(*) AS total FROM holds WHERE user_id = ? AND drawn_at >= CURDATE()";
$query = $mysql->prepare($sql);
$query->bind_param("i", $user_id);
$query->execute();
$array = $query->get_result();
$row = $array->fetch_assoc();

if($row["total"] >= 3){
    $response = [];
    $response["success"] = false;
    $response["message"] = "You've already drawn 3 bottles today!";
    echo json_encode($response);
    exit;
}

// the drawing user's own current virtual position, needed for the
// proximity factor below
$user_age_days = get_age_days($current_user["created_at"]);
$user_pos = get_position($current_user["seed"], $user_age_days);

// fetch every bottle eligible to be drawn by this user - same base
// filter as before (active, not their own, not already held by them),
// plus a hard exclusion for still-sealed time capsules: unlike
// proximity, a future unlocks_at doesn't just bias the odds, it makes
// the bottle genuinely undrawable until that moment passes
$sql = "SELECT * FROM bottles
        WHERE is_active = 1
        AND author_id != ?
        AND id NOT IN (SELECT bottle_id FROM holds WHERE user_id = ?)
        AND (unlocks_at IS NULL OR unlocks_at <= NOW())";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $user_id, $user_id);
$query->execute();
$raw_candidates = $query->get_result()->fetch_all(MYSQLI_ASSOC);

// build the real candidate pool: lazy-retire anything due (same check
// as before, just done for every fetched bottle up front instead of
// one at a time), and compute each survivor's scoring inputs
$candidates = [];
foreach($raw_candidates as $bottle){
    $bottle_id = $bottle["id"];

    $sql = "SELECT COUNT(*) AS total FROM marks WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $mark_count = (int)$query->get_result()->fetch_assoc()["total"];

    $retirement_reason = determine_retirement_reason($bottle, $mark_count);

    if($retirement_reason !== null){
        $sql = "UPDATE bottles SET is_active = 0, retirement_reason = ? WHERE id = ?";
        $query = $mysql->prepare($sql);
        $query->bind_param("si", $retirement_reason, $bottle_id);
        $query->execute();
        continue;
    }

    $sql = "SELECT COUNT(*) AS total FROM holds WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $hold_count = (int)$query->get_result()->fetch_assoc()["total"];

    $bottle_age_days = get_age_days($bottle["created_at"]);
    $bottle_pos = get_position($bottle["seed"], $bottle_age_days);
    $distance = get_distance($user_pos, $bottle_pos);

    $reference = $bottle["last_mark_at"] !== null ? $bottle["last_mark_at"] : $bottle["created_at"];
    $neglect_days = min(get_age_days($reference), 30);

    $candidates[] = [
        "bottle" => $bottle,
        "hold_count" => $hold_count,
        "mark_count" => $mark_count,
        "neglect_days" => $neglect_days,
        "distance" => $distance,
    ];
}

if(count($candidates) == 0){
    $response = [];
    $response["success"] = false;
    $response["message"] = "No bottles available to draw right now!";
    echo json_encode($response);
    exit;
}

// rarity and proximity are both relative to this candidate pool, so
// they need the pool's bounds before they can be computed
$max_hold_count = max(array_column($candidates, "hold_count"));
$max_distance = max(array_column($candidates, "distance"));

$total_score = 0;
foreach($candidates as &$c){
    $rarity = $max_hold_count > 0 ? 1 - ($c["hold_count"] / $max_hold_count) : 1;
    $neglect = $c["neglect_days"] / 30;
    $marks_factor = (3 - $c["mark_count"]) / 3;
    $proximity = $max_distance > 0 ? 1 - ($c["distance"] / $max_distance) : 1;

    $c["score"] = 0.3 * $rarity + 0.3 * $neglect + 0.3 * $proximity + 0.1 * $marks_factor;
    $total_score += $c["score"];
}
unset($c);

// weighted-random pick: walk the candidates, subtracting each one's
// score from a random point along the total until it goes negative -
// a bottle with double the score of another is twice as likely to be
// picked here, but never guaranteed (roulette-wheel selection)
$target = $total_score > 0 ? (mt_rand() / mt_getrandmax()) * $total_score : 0;
$bottle = null;
foreach($candidates as $c){
    $target -= $c["score"];
    if($target <= 0){
        $bottle = $c["bottle"];
        break;
    }
}
// floating-point safety net - should only trigger if every score was
// exactly 0, in which case any candidate is as good as any other
if($bottle === null){
    $bottle = end($candidates)["bottle"];
}

$bottle_id = $bottle["id"];

$sql = "INSERT INTO holds(bottle_id, user_id) VALUES(?, ?)";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $bottle_id, $user_id);
$query->execute();

$sql = "SELECT content FROM marks WHERE bottle_id = ?";
$query = $mysql->prepare($sql);
$query->bind_param("i", $bottle_id);
$query->execute();
$array = $query->get_result();

$marks = [];
while($mark = $array->fetch_assoc()){
    $marks[] = $mark["content"];
}

$response = [];
$response["success"] = true;
$response["data"] = [];
$response["data"]["bottle"] = $bottle;
$response["data"]["marks"] = $marks;
echo json_encode($response);

?>
