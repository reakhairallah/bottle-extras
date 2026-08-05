<?php

include("connection.php");

if(isset($_COOKIE["bottle_token"])){
    $token = $_COOKIE["bottle_token"];

    $sql = "SELECT * FROM users WHERE token = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("s", $token);
    $query->execute();
    $array = $query->get_result();

    $current_user = $array->fetch_assoc();
} else {
    $current_user = null;
}

if($current_user == null) {

    $token = bin2hex(random_bytes(32));

    $adjectives = ["Quiet", "Salty", "Drifting", "Hidden", "Lonely", "Restless"];
    $nouns = ["Harbor", "Wave", "Compass", "Tide", "Shore", "Anchor"];

    $adjective = $adjectives[rand(0, count($adjectives) - 1)];
    $noun = $nouns[rand(0, count($nouns) - 1)];
    $display_name = $adjective . $noun . rand(1, 99);

    $sql = "INSERT INTO users(token, display_name) VALUES(?, ?)";
    $query = $mysql->prepare($sql);
    $query->bind_param("ss", $token, $display_name);
    $query->execute();

    setcookie("bottle_token", $token, time() + (60 * 60 * 24 * 365), "/");

    $sql = "SELECT * FROM users WHERE token = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("s", $token);
    $query->execute();
    $array = $query->get_result();
    $current_user = $array->fetch_assoc();
}

?>
