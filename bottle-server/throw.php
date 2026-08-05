<?php

include("database/token.php");

if(isset($_POST["content"])){
    $content = $_POST["content"];
} else {
    $response = [];
    $response["success"] = false;
    $response["message"] = "Content is missing!";
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

$author_id = $current_user["id"];

$sql = "SELECT COUNT(*) AS total FROM bottles WHERE author_id = ? AND created_at >= CURDATE()";
$query = $mysql->prepare($sql);
$query->bind_param("i", $author_id);
$query->execute();
$array = $query->get_result();
$row = $array->fetch_assoc();

if($row["total"] >= 3){
    $response = [];
    $response["success"] = false;
    $response["message"] = "You've already thrown 3 bottles today!";
    echo json_encode($response);
    exit;
}

$sql = "INSERT INTO bottles(author_id, content) VALUES(?, ?)";
$query = $mysql->prepare($sql);
$query->bind_param("is", $author_id, $content);
$query->execute();

$response = [];
$response["success"] = true;
$response["message"] = "Bottle thrown!";
echo json_encode($response);

?>
