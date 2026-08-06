<?php

include("database/token.php");
include("database/retirement.php");

// lightweight, read-only supply for the ocean's decorative cycling pool
// (see CLAUDE.md "Integration architecture") - mirrors draw.php's
// eligibility filters (active, not the viewer's own, not already held
// by them, not sealed/future unlocks_at), but deliberately skips the
// daily throw/draw-limit checks entirely, since those gate an ACTION
// (drawing), not a VIEW (which bottles are visible drifting by). No
// content is returned - just enough (id, seed, created_at) for the
// client to derive each bottle's position and animate it; the actual
// draw, when the user clicks one, is a separate draw.php call.

$user_id = $current_user["id"];

// ORDER BY RAND() + a hard cap, not "every active bottle" - the ocean
// only ever renders 5 at once regardless of how many hundreds might be
// active, and a random sample keeps repeat visits from always seeing
// the same oldest 50 rather than a fair cross-section
$sql = "SELECT * FROM bottles
        WHERE is_active = 1
        AND author_id != ?
        AND id NOT IN (SELECT bottle_id FROM holds WHERE user_id = ?)
        AND (unlocks_at IS NULL OR unlocks_at <= NOW())
        ORDER BY RAND()
        LIMIT 50";
$query = $mysql->prepare($sql);
$query->bind_param("ii", $user_id, $user_id);
$query->execute();
$raw_candidates = $query->get_result()->fetch_all(MYSQLI_ASSOC);

$response = [];
$response["success"] = true;
$response["data"] = [];

// same lazy-retirement check every other bottle-touching endpoint does -
// a candidate whose is_active flag is stale (due to retire, not yet
// touched by anything) shouldn't still be shown drifting in the ocean
foreach($raw_candidates as $bottle){
    $bottle_id = $bottle["id"];

    $sql = "SELECT COUNT(*) AS total FROM marks WHERE bottle_id = ?";
    $query = $mysql->prepare($sql);
    $query->bind_param("i", $bottle_id);
    $query->execute();
    $mark_count = (int)$query->get_result()->fetch_assoc()["total"];

    $retirement_reason = determine_retirement_reason($bottle, $mark_count);

    if($retirement_reason !== null){
        $sql = "UPDATE bottles SET is_active = 0, retirement_reason = ? WHERE id = ?";
        $query = $mysql->prepare($sql);
        $query->bind_param("si", $retirement_reason, $bottle_id);
        $query->execute();
        continue;
    }

    $response["data"][] = [
        "id" => $bottle["id"],
        "seed" => $bottle["seed"],
        "created_at" => $bottle["created_at"],
    ];
}

echo json_encode($response);

?>
