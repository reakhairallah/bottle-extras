<?php

include("database/token.php");
include("database/retirement.php");

// lazy retirement sweep: unlike draw.php/mark.php/get_dashboard.php,
// which only ever touch bottles tied to one user's action, the archive
// is the one place meant to show every retired bottle system-wide - so
// reading it is what checks the whole currently-active pool for
// anything that's newly due, not just what one user happens to touch
$sql = "SELECT * FROM bottles WHERE is_active = 1 AND retirement_reason IS NULL";
$query = $mysql->prepare($sql);
$query->execute();
$active_bottles = $query->get_result();

while($bottle = $active_bottles->fetch_assoc()){
    $bottle_id = $bottle["id"];

    $sql = "SELECT COUNT(*) AS total FROM marks WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $mark_count = $query->get_result()->fetch_assoc()["total"];

    $retirement_reason = determine_retirement_reason($bottle, (int)$mark_count);

    if($retirement_reason !== null){
        $sql = "UPDATE bottles SET is_active = 0, retirement_reason = ? WHERE id = ?";
        $query = $mysql->prepare($sql);
        $query->bind_param("si", $retirement_reason, $bottle_id);
        $query->execute();
    }
}

// archive page shows only 'neglected' and 'completed' - reported
// bottles are soft-deleted, not archived, and stay out of this list
$sql = "SELECT * FROM bottles WHERE retirement_reason IN ('neglected', 'completed') ORDER BY created_at DESC";
$query = $mysql->prepare($sql);
$query->execute();
$array = $query->get_result();

$response = [];
$response["success"] = true;
$response["data"] = [];

while($bottle = $array->fetch_assoc()){
    $bottle_id = $bottle["id"];

    // archive is public and anonymous, same as the rest of the app -
    // never expose who threw a bottle
    unset($bottle["author_id"]);

    $sql = "SELECT COUNT(*) AS total FROM holds WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $hold_row = $query->get_result()->fetch_assoc();
    $bottle["hold_count"] = $hold_row["total"];

    $sql = "SELECT content FROM marks WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $marks_result = $query->get_result();

    $marks = [];
    while($mark = $marks_result->fetch_assoc()){
        $marks[] = $mark["content"];
    }
    $bottle["marks"] = $marks;

    $response["data"][] = $bottle;
}

echo json_encode($response);

?>
