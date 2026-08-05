<?php

include("database/token.php");

if(isset($_POST["bottle_id"]) && isset($_POST["content"])) {
    $bottle_id = $_POST["bottle_id"];
    $content = $_POST["content"];
} else {
    $response = [];
    $response["success"] = false;
    $response["message"] = "Bottle id or content is missing!";
    echo json_encode($response);
    exit;
}

if(trim($content) === ""){
    $response = [];
    $response["success"] = false;
    $response["message"] = "Content cannot be empty!";
    echo json_encode($response);
    exit;
}

$user_id = $current_user["id"];

$sql = "INSERT INTO marks(bottle_id, user_id, content) VALUES(?, ?, ?)";
$query = $mysql->prepare($sql);
$query->bind_param("iis", $bottle_id, $user_id, $content);

try {
    $query->execute();
    $response = [];
    $response["success"] = true;
    $response["message"] = "Mark added!";
    echo json_encode($response);
} catch(mysqli_sql_exception $e){
    $response = [];
    $response["success"] = false;
    $response["message"] = "You've already left a mark on this bottle!";
    echo json_encode($response);
}

?>
