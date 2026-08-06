<?php

include("database/token.php");
include("database/retirement.php");

$user_id = $current_user["id"];

// includes the user's own history, not just what's still circulating -
// active (is_active=1) plus anything that completed or was neglected.
// Deliberately excludes 'kept' (its own dedicated view, get_shelf.php)
// and 'reported' (silently removed, no dashboard visibility for it).
$sql = "SELECT * FROM bottles WHERE author_id = ? AND (is_active = 1 OR retirement_reason IN ('completed', 'neglected'))";
$query = $mysql->prepare($sql);
$query->bind_param("i", $user_id);
$query->execute();
$array = $query->get_result();

$response = [];
$response["success"] = true;
$response["data"] = [];

while($bottle = $array->fetch_assoc()) {
    $bottle_id = $bottle["id"];

    $sql = "SELECT COUNT(*) AS total FROM holds WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $hold_result = $query->get_result();
    $hold_row = $hold_result->fetch_assoc();
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

    // lazy retirement check: this bottle's is_active flag can be stale
    // if nothing has touched it since it became due. Unlike draw.php/
    // get_archive.php, a newly-retired bottle here is NOT excluded -
    // the dashboard shows the user's own Completed/Neglected history
    // too now, so it belongs in this response with its new status
    // rather than being dropped.
    $retirement_reason = determine_retirement_reason($bottle, count($marks));

    if($retirement_reason !== null){
        $sql = "UPDATE bottles SET is_active = 0, retirement_reason = ? WHERE id = ?";
        $query = $mysql->prepare($sql);
        $query->bind_param("si", $retirement_reason, $bottle_id);
        $query->execute();

        $bottle["is_active"] = 0;
        $bottle["retirement_reason"] = $retirement_reason;
    }

    $response["data"][] = $bottle;
}

echo json_encode($response);

?>
