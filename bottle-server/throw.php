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

// unlocks_at is optional - most throws leave it out entirely, meaning
// an ordinary, unsealed bottle. If one is submitted, it has to parse
// to a real date and land strictly in the future; anything else
// (garbage input, a past date, "right now") is a hard reject rather
// than silently dropping what the user typed
$unlocks_at = null;

if(isset($_POST["unlocks_at"]) && trim($_POST["unlocks_at"]) !== ""){
    $unlocks_at_ts = strtotime($_POST["unlocks_at"]);

    if($unlocks_at_ts === false || $unlocks_at_ts <= time()){
        $response = [];
        $response["success"] = false;
        $response["message"] = "Unlock date must be in the future!";
        echo json_encode($response);
        exit;
    }

    $unlocks_at = date("Y-m-d H:i:s", $unlocks_at_ts);
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

$seed = mt_rand(1, 2147483647);

$sql = "INSERT INTO bottles(author_id, content, seed, unlocks_at) VALUES(?, ?, ?, ?)";
$query = $mysql->prepare($sql);
$query->bind_param("isis", $author_id, $content, $seed, $unlocks_at);
$query->execute();

$response = [];
$response["success"] = true;
$response["message"] = "Bottle thrown!";
echo json_encode($response);

?>
