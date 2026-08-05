<?php

// pure decision logic for the two "leaves circulation" rules - no
// queries, no writes here. Given a bottle's row (needs at least
// is_active, retirement_reason, created_at, last_mark_at) and how many
// marks it currently has, decide whether it should retire and why.
// Callers own actually persisting the result (UPDATE bottles ...).

function determine_retirement_reason($bottle, $mark_count){
    // already retired - reported, or previously neglected/completed -
    // nothing left to decide
    if($bottle["is_active"] == 0 || $bottle["retirement_reason"] !== null){
        return null;
    }

    // reaching 3 marks completes a bottle outright, regardless of timing
    if($mark_count >= 3){
        return "completed";
    }

    // otherwise: has it gone 30 days without a mark? the clock starts
    // from the last mark, or from when it was thrown if it has none yet
    $reference = $bottle["last_mark_at"] !== null ? $bottle["last_mark_at"] : $bottle["created_at"];
    $seconds_since = time() - strtotime($reference);

    if($seconds_since >= 30 * 86400){
        return "neglected";
    }

    return null;
}

?>
