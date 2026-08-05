<?php

include("database/token.php");
include("database/retirement.php");

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

    // a new mark resets the neglect clock - update last_mark_at before
    // running the retirement check below, since that check reads it
    $sql = "UPDATE bottles SET last_mark_at = NOW() WHERE id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();

    // this mark might be the 3rd one - check right away instead of
    // waiting for the bottle to be touched again elsewhere
    $sql = "SELECT * FROM bottles WHERE id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $bottle = $query->get_result()->fetch_assoc();

    $sql = "SELECT COUNT(*) AS total FROM marks WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $mark_count = $query->get_result()->fetch_assoc()["total"];

    $retirement_reason = determine_retirement_reason($bottle, (int)$mark_count);

    if($retirement_reason !== null){
        $sql = "UPDATE bottles SET is_active = 0, retirement_reason = ? WHERE id = ?";
        $query = $mysql->prepare($sql);
        $query->bind_param("si", $retirement_reason, $bottle_id);
        $query->execute();
    }

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
