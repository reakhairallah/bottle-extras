<?php

include("database/token.php");

$user_id = $current_user["id"];

$sql = "SELECT COUNT(*) AS total FROM bottles WHERE author_id = ? AND created_at >= CURDATE()";
$query = $mysql->prepare($sql);
$query->bind_param("i", $user_id);
$query->execute();
$array = $query->get_result();
$row = $array->fetch_assoc();

$response = [];
$response["success"] = true;
$response["data"] = [];
$response["data"]["display_name"] = $current_user["display_name"];
$response["data"]["can_throw"] = $row["total"] < 3;

echo json_encode($response);

?>
