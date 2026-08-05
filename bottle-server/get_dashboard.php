<?php

include("database/token.php");

$user_id = $current_user["id"];

$sql = "SELECT * FROM bottles WHERE author_id = ? AND is_active = 1";
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

    $response["data"][] = $bottle;
}

echo json_encode($response);

?>
