<?php

include("database/token.php");

$user_id = $current_user["id"];

// keeps.user_id is UNIQUE, so this is at most one row - it's the
// user's own bottle, so no need to hide author_id the way the archive
// does
$sql = "SELECT b.*, k.kept_at FROM keeps k JOIN bottles b ON b.id = k.bottle_id WHERE k.user_id = ?";
$query = $mysql->prepare($sql);
$query->bind_param("i", $user_id);
$query->execute();
$bottle = $query->get_result()->fetch_assoc();

$response = [];
$response["success"] = true;

if($bottle == null){
    $response["data"] = null;
    echo json_encode($response);
    exit;
}

$bottle_id = $bottle["id"];

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

$response["data"] = $bottle;
echo json_encode($response);

?>
