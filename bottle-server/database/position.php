<?php

// pure position logic - no queries, no writes. Given a seed (stored on
// both bottles and users) and an age in days, deterministically derive
// a point on the abstract 0-1000 x 0-1000 plane. Same seed + same age
// always produces the same point; nothing here is ever persisted.

// deterministically turns (seed, label) into a number in [min, max).
// same seed+label always hashes to the same value; different labels on
// the same seed produce unrelated-looking values, so origin/amplitude/
// frequency/phase don't end up collapsing onto each other.
function derive_value($seed, $label, $min, $max){
    $hash = crc32($seed . ":" . $label);
    $fraction = $hash / 4294967295; // 0xFFFFFFFF, max value crc32() can return
    return $min + $fraction * ($max - $min);
}

// one bottle/user's derived, fixed-for-life motion parameters. origin
// is kept within [100, 900] and amplitude within [30, 100] on purpose -
// origin +/- amplitude can then never leave the 0-1000 plane, so
// position never needs to be clamped (which would otherwise flatten
// the wobble at the edges).
function derive_motion_params($seed){
    return [
        "origin_x" => derive_value($seed, "origin_x", 100, 900),
        "origin_y" => derive_value($seed, "origin_y", 100, 900),
        "amplitude_x" => derive_value($seed, "amplitude_x", 30, 100),
        "amplitude_y" => derive_value($seed, "amplitude_y", 30, 100),
        // frequency picked so one full wobble cycle takes somewhere
        // between 7 and 30 days (period = 2*pi / frequency)
        "frequency_x" => derive_value($seed, "frequency_x", 2 * M_PI / 30, 2 * M_PI / 7),
        "frequency_y" => derive_value($seed, "frequency_y", 2 * M_PI / 30, 2 * M_PI / 7),
        "phase_x" => derive_value($seed, "phase_x", 0, 2 * M_PI),
        "phase_y" => derive_value($seed, "phase_y", 0, 2 * M_PI),
    ];
}

// current position for a given seed at a given age (in days, fractional
// - not rounded, so motion is smooth rather than jumping once a day).
// bounded sin/cos wobble only: no term that grows with age, so a bottle
// from a year ago and one from an hour ago live in the same 0-1000
// space.
function get_position($seed, $age_days){
    $p = derive_motion_params($seed);

    $x = $p["origin_x"] + $p["amplitude_x"] * sin($p["frequency_x"] * $age_days + $p["phase_x"]);
    $y = $p["origin_y"] + $p["amplitude_y"] * sin($p["frequency_y"] * $age_days + $p["phase_y"]);

    return ["x" => $x, "y" => $y];
}

// plain Euclidean distance between two derived positions
function get_distance($pos_a, $pos_b){
    return sqrt(pow($pos_a["x"] - $pos_b["x"], 2) + pow($pos_a["y"] - $pos_b["y"], 2));
}

// age in fractional days between a stored created_at timestamp and now
function get_age_days($created_at){
    return (time() - strtotime($created_at)) / 86400;
}

?>
