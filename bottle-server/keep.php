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

// has to be one of the user's own bottles, and still actually
// circulating - otherwise someone could keep a bottle that isn't
// theirs, or overwrite an already-reported/neglected/completed
// bottle's real retirement reason with 'kept'
$sql = "SELECT * FROM bottles WHERE id = ? AND author_id = ? AND is_active = 1 AND retirement_reason IS NULL";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $bottle_id, $user_id);
$query->execute();
$bottle = $query->get_result()->fetch_assoc();

if($bottle == null){
    $response = [];
    $response["success"] = false;
    $response["message"] = "That bottle can't be kept!";
    echo json_encode($response);
    exit;
}

$sql = "INSERT INTO keeps(user_id, bottle_id) VALUES(?, ?)";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $user_id, $bottle_id);

try {
    $query->execute();
} catch(mysqli_sql_exception $e){
    $response = [];
    $response["success"] = false;
    $response["message"] = "You've already kept a bottle!";
    echo json_encode($response);
    exit;
}

$sql = "UPDATE bottles SET is_active = 0, retirement_reason = 'kept' WHERE id = ?";
$query = $mysql->prepare($sql);
$query->bind_param("i", $bottle_id);
$query->execute();

$response = [];
$response["success"] = true;
$response["message"] = "Bottle kept!";
echo json_encode($response);

?>
