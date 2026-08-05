<?php

include("database/token.php");

if(isset($_POST["bottle_id"])) {
    $bottle_id = $_POST["bottle_id"];
} else {
    $response = [];
    $response["success"] = false;
    $response["message"] = "Bottle id is missing!";
    echo json_encode($response);
    exit;
}

$user_id = $current_user["id"];

$sql = "INSERT INTO reports(bottle_id, user_id) VALUES(?, ?)";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $bottle_id, $user_id);

try {
    $query->execute();
} catch (mysqli_sql_exception $e) {
    $response = [];
    $response["success"] = false;
    $response["message"] = "You've already reported this bottle!";
    echo json_encode($response);
    exit;
}

$sql = "SELECT COUNT(*) AS total FROM reports WHERE bottle_id = ?";
$query = $mysql->prepare($sql);
$query->bind_param("i", $bottle_id);
$query->execute();
$array = $query->get_result();
$row = $array->fetch_assoc();

if($row["total"] >= 3) {
    $sql = "UPDATE bottles SET is_active = 0 WHERE id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
}

$response = [];
$response["success"] = true;
$response["message"] = "Bottle reported!";
echo json_encode($response);

?>
