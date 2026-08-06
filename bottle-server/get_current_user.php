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
// needed by the ocean's real "viewer position" (see database/position.php) -
// same seed+age-derived math already used for every bottle's position
$response["data"]["seed"] = $current_user["seed"];
$response["data"]["created_at"] = $current_user["created_at"];

echo json_encode($response);

?>
