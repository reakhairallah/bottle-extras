<?php

include("database/token.php");

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

$sql = "SELECT * FROM bottles
        WHERE is_active = 1
        AND author_id != ?
        AND id NOT IN (SELECT bottle_id FROM holds WHERE user_id = ?)
        ORDER BY RAND()
        LIMIT 1";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $user_id, $user_id);
$query->execute();
$array = $query->get_result();
$bottle = $array->fetch_assoc();

if($bottle == null){
    $response = [];
    $response["success"] = false;
    $response["message"] = "No bottles available to draw right now!";
    echo json_encode($response);
    exit;
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
