// GAME SCREEN (game.html)
// Step 1 (done): static shell - ocean scene's decorative wave canvas,
// real welcome-name fetch from get_current_user.php.
// Step 2 (done): the real cycling bottle pool - polls
// get_ocean_candidates.php and drifts up to 5 at once, weighted toward
// the viewer's own seed-derived position, per CLAUDE.md's integration
// architecture.
// Step 3 (done): the full draw loop - click any drifting bottle ->
// draw.php (no bottle-id sent, the visual pick is decorative) -> on
// success, stand the clicked bottle up and open it with the real
// content/marks; on failure (limit reached, "throw a bottle first", no
// bottles available), showToast and never start the animation. Then
// mark.php (post), report.php, and close (that specific bottle fades
// out permanently - it's been drawn, so it doesn't return to drifting).
// Step 4 (this pass): the throw modal - the + icon opens it (grown from
// that button's own rect), a seal toggle reveals a future-date field,
// POST to throw.php with an optional unlocks_at, success toast, and an
// immediate candidate-pool refresh right after (also added on the draw
// side above, completing CLAUDE.md's "immediate refresh after throw or
// draw" note - draw's own refresh was a gap left over from Step 3).

// ============================================================
// WAVES - ported as-is from design-drafts/ocean-staged-preview.html
// (the approved source of truth), not landing.js's simplified copy -
// game.html is the actual ocean stage, so it keeps the frontmost
// layer's hand-inked crest stroke that the blurred landing page drops.
// ============================================================
const ocean = document.getElementById("ocean");
const octx = ocean.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width, height, waterline;

function resize(){
    width = ocean.width = window.innerWidth;
    height = ocean.height = window.innerHeight;
    waterline = height * 0.63;
}
window.addEventListener("resize", resize);
resize();

const layers = [
    { primary: { amplitude: 6,  wavelength: 360, speed: 0.0016, phase: 0.5 }, secondary: { amplitude: 3, wavelength: 110, speed: 0.0026, phase: 0.8 }, bob: { amplitude: 5, period: 10500, phase: 0.5 }, yOffset: -14, fill: "rgba(255,255,255,0.035)", stroke: null },
    { primary: { amplitude: 9,  wavelength: 300, speed: 0.0022, phase: 0 },   secondary: { amplitude: 4, wavelength: 95,  speed: 0.0035, phase: 1.4 }, bob: { amplitude: 7, period: 9000,  phase: 0 },   yOffset: 4,   fill: "rgba(255,255,255,0.06)", stroke: null },
    { primary: { amplitude: 10, wavelength: 260, speed: 0.0027, phase: 1.6 }, secondary: { amplitude: 4, wavelength: 85,  speed: 0.004,  phase: 1.0 }, bob: { amplitude: 8, period: 8200,  phase: 1.1 }, yOffset: 22,  fill: "rgba(255,255,255,0.09)", stroke: null },
    { primary: { amplitude: 12, wavelength: 230, speed: 0.0032, phase: 2.1 }, secondary: { amplitude: 5, wavelength: 80,  speed: 0.0048, phase: 0.6 }, bob: { amplitude: 9, period: 7600,  phase: 2.2 }, yOffset: 40,  fill: "rgba(255,255,255,0.14)", stroke: null },
    { primary: { amplitude: 8,  wavelength: 160, speed: 0.0044, phase: 4.4 }, secondary: { amplitude: 4, wavelength: 60,  speed: 0.0065, phase: 3.1 }, bob: { amplitude: 6, period: 6200,  phase: 4.1 }, yOffset: 58,  fill: "rgba(234,247,251,0.22)", stroke: "rgba(6, 40, 44, 0.16)" },
];

function waveY(layer, x, t){
    const p = layer.primary, s = layer.secondary;
    const bob = Math.sin((t / layer.bob.period) * Math.PI * 2 + layer.bob.phase) * layer.bob.amplitude;
    const wave = Math.sin((x / p.wavelength) + t * p.speed + p.phase) * p.amplitude
               + Math.sin((x / s.wavelength) + t * s.speed + s.phase) * s.amplitude;
    return waterline + layer.yOffset + bob + wave;
}

function jitter(x, seed){
    return Math.sin(x * 0.13 + seed) * 0.9 + Math.sin(x * 0.041 + seed * 2.3) * 0.6;
}

function drawWaveLayer(layer, t, seed){
    octx.beginPath();
    octx.moveTo(0, height);
    octx.lineTo(0, waveY(layer, 0, t));
    for(let x = 0; x <= width; x += 6) octx.lineTo(x, waveY(layer, x, t));
    octx.lineTo(width, height);
    octx.closePath();
    octx.fillStyle = layer.fill;
    octx.fill();

    if(layer.stroke){
        octx.beginPath();
        for(let x = 0; x <= width; x += 6){
            const y = waveY(layer, x, t) + jitter(x, seed);
            if(x === 0) octx.moveTo(x, y); else octx.lineTo(x, y);
        }
        octx.strokeStyle = layer.stroke;
        octx.lineWidth = 1.1;
        octx.stroke();
    }
}

let lastT = null;

function frame(t){
    if(lastT === null) lastT = t;
    const dt = t - lastT;
    lastT = t;

    octx.clearRect(0, 0, width, height);
    layers.forEach((layer, i) => drawWaveLayer(layer, t, i * 7.3));
    updateBottles(t, dt);
    if(!reduceMotion) requestAnimationFrame(frame);
}

// kicked off at the bottom of this file, once slots/pool/updateBottles
// are all declared - frame() calls updateBottles() every tick, so
// starting the loop before those exist would throw under
// prefers-reduced-motion (where frame(0) runs synchronously, inline,
// rather than deferred via requestAnimationFrame).

// ============================================================
// WELCOME TEXT - real get_current_user.php call. seed/created_at are
// used below for the viewer's own position (proximity weighting of the
// cycling pool) - real values now, not the preview's fake ones.
// ============================================================
const welcomeEl = document.getElementById("welcome-msg");

let viewerSeed = null;
let viewerAgeAtLoadDays = 0; // viewer's age (in days) at the moment created_at/now were read
let loadedAtMs = null;       // performance.now()-comparable wall-clock anchor for the line above

axios.get(BASE_URL + "get_current_user.php").then((response) => {
    const user = response.data.data;
    welcomeEl.textContent = "Welcome, " + user.display_name;

    viewerSeed = user.seed;
    viewerAgeAtLoadDays = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
    loadedAtMs = Date.now();

    startBottlePolling();
}).catch((error) => {
    welcomeEl.textContent = "Welcome";
    console.error("Failed to load current user:", error.message);
});

// ============================================================
// BOTTLES: real cycling pool. Position/pickNextBottle math ported as-is
// from design-drafts/ocean-staged-preview.html - only the pool's source
// (get_ocean_candidates.php instead of a fake FLAVOR array) and the
// viewer's seed/age (real, from get_current_user.php above) differ.
// Click handling (handleBottleClick) is wired further down, once the
// grab/stand-up/open machinery it depends on is declared.
// ============================================================
const SLOT_COUNT = 5;
const BOTTLE_BASE_WIDTH = 56;
const BOTTLE_ASPECT = 230 / 120;
const CROSS_DURATION_MS = 45000;
const CANDIDATE_POLL_MS = 90000; // 1.5min, within the agreed 1-2min cadence
// minimum progress-space between any two slots at the moment one
// respawns - without this, every slot used to reset to exactly
// progress=0 on cycling, and since speedFactor only varies +-15%, the
// 5 slots would periodically drift back into sync and all cross
// progress>=1 around the same real-time moment, restarting together as
// a visible cluster entering from the right edge at once.
const MIN_PROGRESS_GAP = 0.2;

function seededValue(seed, label, min, max){
    const str = seed + ":" + label;
    let hash = 0;
    for(let i = 0; i < str.length; i++){ hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
    return min + (Math.abs(hash) / 2147483647) * (max - min);
}

function getAbstractPosition(seed, ageDays){
    const originX = seededValue(seed, "originX", 100, 900);
    const originY = seededValue(seed, "originY", 100, 900);
    const ampX = seededValue(seed, "ampX", 30, 100);
    const ampY = seededValue(seed, "ampY", 30, 100);
    const freqX = seededValue(seed, "freqX", (2 * Math.PI) / 30, (2 * Math.PI) / 7);
    const freqY = seededValue(seed, "freqY", (2 * Math.PI) / 30, (2 * Math.PI) / 7);
    const phaseX = seededValue(seed, "phaseX", 0, 2 * Math.PI);
    const phaseY = seededValue(seed, "phaseY", 0, 2 * Math.PI);
    return {
        x: originX + ampX * Math.sin(freqX * ageDays + phaseX),
        y: originY + ampY * Math.sin(freqY * ageDays + phaseY),
    };
}

// real viewer position at "now" (viewerAgeAtLoadDays plus however much
// wall-clock time has passed since the get_current_user.php response)
function getViewerPosition(){
    if(viewerSeed === null) return { x: 500, y: 500 }; // not loaded yet - inert center point
    const elapsedDays = (Date.now() - loadedAtMs) / 86400000;
    return getAbstractPosition(viewerSeed, viewerAgeAtLoadDays + elapsedDays);
}

let pool = []; // real candidates from get_ocean_candidates.php: {id, seed, content:null, ageDaysAtLoad, loadedAtMs}

function fetchCandidates(){
    axios.get(BASE_URL + "get_ocean_candidates.php").then((response) => {
        const now = Date.now();
        pool = response.data.data.map((b) => ({
            id: b.id,
            seed: b.seed,
            ageDaysAtLoad: (now - new Date(b.created_at).getTime()) / 86400000,
            loadedAtMs: now,
        }));
    }).catch((error) => {
        console.error("Failed to load ocean candidates:", error.message);
    });
}

function bottleAgeDaysNow(bottle){
    return bottle.ageDaysAtLoad + (Date.now() - bottle.loadedAtMs) / 86400000;
}

function pickNextBottle(excludeIds){
    const viewerPos = getViewerPosition();
    const candidates = pool.filter(b => !excludeIds.has(b.id));
    if(candidates.length === 0) return null;
    const distances = candidates.map(b => {
        const pos = getAbstractPosition(b.seed, bottleAgeDaysNow(b));
        return Math.hypot(pos.x - viewerPos.x, pos.y - viewerPos.y);
    });
    const maxDist = Math.max(...distances, 1);
    const weights = distances.map(d => 1 - d / maxDist + 0.05);
    const total = weights.reduce((a, b) => a + b, 0);
    let target = Math.random() * total;
    for(let i = 0; i < candidates.length; i++){
        target -= weights[i];
        if(target <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

const slotsEl = document.getElementById("bottle-slots");
const slots = [];

for(let i = 0; i < SLOT_COUNT; i++){
    const wrap = document.createElement("div");
    wrap.className = "bottle-instance";
    wrap.innerHTML =
        '<svg class="bottle-svg" viewBox="0 0 120 230" aria-hidden="true">' +
        '<g class="bottle-scroll" opacity="0.85"><rect x="42" y="118" width="36" height="52" rx="7" fill="#f3e8c9" transform="rotate(-6 60 144)" /></g>' +
        '<path d="M50 14 L70 14 L70 64 C70 78 96 77 98 104 C100 128 100 158 98 179 C97 199 89 213 60 215 C31 213 23 199 22 179 C20 158 20 128 22 104 C24 77 50 78 50 64 Z" fill="url(#bottle-glass)" fill-opacity="0.62" stroke="#2c4a38" stroke-width="1.5" stroke-opacity="0.4" />' +
        '<path d="M32 96 C29 128 29 162 33 190" fill="none" stroke="#eef7ee" stroke-width="4" stroke-linecap="round" opacity="0.35" />' +
        '<g class="bottle-cork-rect">' +
        '<rect x="45" y="1" width="30" height="18" rx="5" fill="url(#bottle-cork)" stroke="#8a6a3d" stroke-width="1" />' +
        '<line x1="51" y1="5" x2="51" y2="15" stroke="#8a6a3d" stroke-width="1" opacity="0.6" />' +
        '<line x1="60" y1="4" x2="60" y2="16" stroke="#8a6a3d" stroke-width="1" opacity="0.6" />' +
        '<line x1="69" y1="5" x2="69" y2="15" stroke="#8a6a3d" stroke-width="1" opacity="0.6" />' +
        '</g>' +
        "</svg>";
    slotsEl.appendChild(wrap);

    const slot = {
        wrap,
        svg: wrap.querySelector(".bottle-svg"),
        progress: i / SLOT_COUNT,
        bottle: null,
        grabbed: false,
    };
    slots.push(slot);
    slot.svg.addEventListener("click", () => handleBottleClick(slot));
}

// where a respawning slot should restart: at or behind (progress-wise)
// whichever active slot is currently furthest back in the queue, minus
// a fixed gap - guarantees even spacing on entry regardless of how the
// slots' independent speeds happened to line up, rather than leaving
// spacing to chance
function nextRespawnProgress(slot){
    const others = slots.filter(s => s !== slot && s.bottle && !s.grabbed);
    if(others.length === 0) return 0;
    const minProgress = Math.min(...others.map(s => s.progress));
    return Math.min(0, minProgress - MIN_PROGRESS_GAP);
}

function assignBottle(slot){
    const next = pickNextBottle(new Set(slots.filter(s => s.bottle).map(s => s.bottle.id)));
    slot.bottle = next;
    slot.layer = 2 + Math.floor(Math.random() * 3);
    slot.scale = 0.78 + Math.random() * 0.24;
    slot.baseRot = -75 - Math.random() * 10;
    slot.rockAmp = 3 + Math.random() * 2;
    slot.rockSpeed = 0.0007 + Math.random() * 0.0006;
    slot.rockPhase = Math.random() * Math.PI * 2;
    // kept fairly tight (+-8%, was +-15%) - a wider spread let a faster
    // bottle drift back into a slower one ahead of it mid-crossing,
    // eroding the spacing enforced at respawn (see nextRespawnProgress)
    slot.speedFactor = 0.92 + Math.random() * 0.16;
}

function updateBottles(t, dt){
    slots.forEach(slot => {
        if(slot.grabbed) return; // frozen while standing up / open / closing (later step)

        if(!slot.bottle){
            if(pool.length === 0) return; // nothing to show yet - still waiting on first fetch
            assignBottle(slot);
            if(!slot.bottle) return; // pool exhausted (fewer active candidates than slots)
        }

        slot.progress += (dt / CROSS_DURATION_MS) * slot.speedFactor;
        if(slot.progress >= 1){
            slot.progress = nextRespawnProgress(slot);
            assignBottle(slot);
        }

        const svgWidth = BOTTLE_BASE_WIDTH * slot.scale;
        const svgHeight = svgWidth * BOTTLE_ASPECT;
        const x = width + svgWidth - slot.progress * (width + svgWidth * 2);
        const y = waveY(layers[slot.layer], x, t);
        const rock = Math.sin(t * slot.rockSpeed + slot.rockPhase) * slot.rockAmp;

        const edge = Math.min(slot.progress, 1 - slot.progress);
        const opacity = Math.min(1, edge / 0.06);

        slot.wrap.style.transform = `translate(${x - svgWidth / 2}px, ${y - svgHeight / 2}px)`;
        slot.wrap.style.opacity = opacity;
        slot.svg.style.width = svgWidth + "px";
        slot.svg.style.transform = `rotate(${slot.baseRot + rock}deg)`;
    });
}

function startBottlePolling(){
    fetchCandidates();
    setInterval(fetchCandidates, CANDIDATE_POLL_MS);
}

// ============================================================
// GRAB / STAND-UP / OPEN / RELEASE - ported from
// design-drafts/ocean-staged-preview.html's grabBottle/releaseBottle,
// with the real draw.php call gating the whole sequence: the animation
// only starts once draw.php has actually succeeded (see
// handleBottleClick below), and the modal is filled with that response's
// real content/marks - not the slot's own (content-less, decorative)
// pool data.
// ============================================================
const cork = document.getElementById("cork");
const puff = document.getElementById("puff");
const backdrop = document.getElementById("backdrop");
const paper = document.getElementById("paper");
const paperMessage = document.getElementById("paper-message");
const paperMarks = document.getElementById("paper-marks");
const markTextarea = document.getElementById("mark-textarea");
const markCharCount = document.getElementById("mark-char-count");
const reportBtn = document.getElementById("report-btn");
const closeBtn = document.getElementById("close-bottle-btn");
const postBtn = document.getElementById("post-mark-btn");

let grabbedSlot = null;
let drawInFlight = false;
let currentBottleId = null;

// named beats, same values/reasoning as the approved preview: STAND_UP_MS
// matches the .bottle-instance.grabbed CSS transition duration,
// CORK_SEAT_MS gives the cork a beat visibly seated before it pops,
// POP_TO_MODAL_MS lets the pop/puff read before the paper takes over.
const STAND_UP_MS = 900;
const CORK_SEAT_MS = 250;
const POP_TO_MODAL_MS = 500;

function handleBottleClick(slot){
    if(grabbedSlot || drawInFlight || throwModalOpen) return; // one thing at a time
    drawInFlight = true;

    axios.get(BASE_URL + "draw.php").then((response) => {
        drawInFlight = false;
        if(!response.data.success){
            showToast("error", response.data.message);
            return;
        }
        // immediate refresh (not just the 90s poll) - the bottle just
        // drawn is now held, so it should drop out of the ocean's own
        // candidate pool as soon as possible rather than lingering for
        // up to CANDIDATE_POLL_MS. Per CLAUDE.md's integration
        // architecture: "an immediate refresh right after the user
        // throws or draws a bottle."
        fetchCandidates();
        beginDrawSequence(slot, response.data.data.bottle, response.data.data.marks);
    }).catch((error) => {
        drawInFlight = false;
        showToast("error", "Something went wrong drawing a bottle: " + error.message);
    });
}

function beginDrawSequence(slot, bottle, marks){
    grabbedSlot = slot;
    slot.grabbed = true;
    slot.wrap.classList.add("grabbed");
    slot.wrap.style.opacity = 1;
    currentBottleId = bottle.id;

    // stand up: move to the fixed presentation spot and rotate from
    // lying-flat to upright, growing from the small drifting scale to
    // the full presentation size - see CLAUDE.md's "ocean-staged"
    // section for why (a tiny bottle glimpsed in the water becoming
    // large enough to actually read).
    const targetX = width * 0.5;
    const targetY = height * 0.62;
    const svgWidth = Math.min(width * 0.24, 190);
    const svgHeight = svgWidth * BOTTLE_ASPECT;

    slot.wrap.style.transform = `translate(${targetX - svgWidth / 2}px, ${targetY - svgHeight / 2}px)`;
    slot.svg.style.width = svgWidth + "px";
    slot.svg.style.transform = "rotate(0deg)";

    const spriteCork = slot.wrap.querySelector(".bottle-cork-rect");
    const scroll = slot.wrap.querySelector(".bottle-scroll");

    setTimeout(() => {
        // swap the sprite's own baked-in cork for the real, poppable
        // one in the same instant, transition suppressed for the swap
        // itself so there's no gap where neither is drawn
        cork.style.transition = "none";
        if(spriteCork) spriteCork.style.opacity = 0;
        cork.classList.add("visible");
        cork.offsetHeight; // force layout before re-enabling the transition
        cork.style.transition = "";
    }, STAND_UP_MS);

    setTimeout(() => {
        cork.classList.add("popped");
        puff.classList.add("popped");
        if(scroll) scroll.style.opacity = 0;
    }, STAND_UP_MS + CORK_SEAT_MS);

    setTimeout(() => {
        openPaper(targetX, targetY, svgHeight, bottle, marks);
    }, STAND_UP_MS + CORK_SEAT_MS + POP_TO_MODAL_MS);
}

// grows the shared .paper (styles/components.css) from a small box near
// the standing bottle's neck to the canonical centered modal size - same
// "only left/top/width/height transition, never the clip-path itself"
// technique archive.js already uses for its card-expand, just anchored
// to the presentation spot instead of a clicked card's rect.
function openPaper(bottleCenterX, bottleCenterY, bottleHeight, bottle, marks){
    paperMessage.textContent = bottle.content;

    paperMarks.innerHTML = "";
    marks.forEach((markText) => {
        paperMarks.appendChild(createMarkElement(markText, "paper-mark"));
    });

    markTextarea.value = "";
    markCharCount.textContent = "0";
    postBtn.disabled = false;

    const closedW = 40, closedH = 56;
    const closedLeft = bottleCenterX - closedW / 2;
    const closedTop = bottleCenterY - bottleHeight / 2 - 30 - closedH / 2;

    paper.style.transition = "none";
    paper.style.left = closedLeft + "px";
    paper.style.top = closedTop + "px";
    paper.style.width = closedW + "px";
    paper.style.height = closedH + "px";
    paper.offsetHeight; // force layout before re-enabling transitions
    paper.style.transition = "";

    backdrop.classList.add("open");
    paper.classList.add("open");

    const w = Math.min(window.innerWidth * 0.9, 420);
    const h = Math.min(window.innerHeight * 0.7, 460);
    paper.style.left = (window.innerWidth - w) / 2 + "px";
    paper.style.top = (window.innerHeight - h) / 2 + "px";
    paper.style.width = w + "px";
    paper.style.height = h + "px";
}

// closes the paper/backdrop and permanently fades this bottle out (it's
// been drawn - unlike a normal cycle, it does not return to drifting);
// the vacated slot is freed so the normal cycling logic picks a fresh
// pool bottle and fades it in from the right edge, same as any other cycle.
function releaseBottle(){
    if(!grabbedSlot) return;
    const slot = grabbedSlot;
    grabbedSlot = null;
    currentBottleId = null;

    backdrop.classList.remove("open");
    paper.classList.remove("open");
    cork.classList.remove("popped");
    cork.classList.remove("visible");
    puff.classList.remove("popped");

    setTimeout(() => {
        slot.wrap.style.opacity = 0;
        const scroll = slot.wrap.querySelector(".bottle-scroll");
        if(scroll) scroll.style.opacity = "";
        setTimeout(() => {
            slot.wrap.classList.remove("grabbed");
            slot.bottle = null;
            slot.progress = 0;
            slot.grabbed = false;
            const spriteCork = slot.wrap.querySelector(".bottle-cork-rect");
            if(spriteCork) spriteCork.style.opacity = "";
        }, 350);
    }, 700);
}

markTextarea.addEventListener("input", () => {
    markCharCount.textContent = markTextarea.value.length;
});

postBtn.addEventListener("click", () => {
    if(markTextarea.value.trim() === ""){
        showToast("error", "Write something before posting a mark.");
        return;
    }

    postBtn.disabled = true;
    const body = new URLSearchParams();
    body.append("bottle_id", currentBottleId);
    body.append("content", markTextarea.value);

    axios.post(BASE_URL + "mark.php", body).then((response) => {
        if(response.data.success){
            showToast("success", response.data.message);
            releaseBottle();
        } else {
            postBtn.disabled = false;
            showToast("error", response.data.message);
        }
    }).catch((error) => {
        postBtn.disabled = false;
        showToast("error", "Something went wrong posting this mark: " + error.message);
    });
});

reportBtn.addEventListener("click", async () => {
    const ok = await confirmDialog("Are you sure you want to report this bottle?", "Report");
    if(!ok) return;

    const body = new URLSearchParams();
    body.append("bottle_id", currentBottleId);

    axios.post(BASE_URL + "report.php", body).then((response) => {
        showToast(response.data.success ? "success" : "error", response.data.message);
        releaseBottle();
    }).catch((error) => {
        showToast("error", "Something went wrong reporting this bottle: " + error.message);
    });
});

closeBtn.addEventListener("click", releaseBottle);
// deliberately NOT wired to releaseBottle - a bottle can only be drawn
// once, so an accidental backdrop click must not dismiss it. Only the
// explicit Close button (or a successful mark/report) does.
backdrop.addEventListener("click", (e) => { e.stopPropagation(); });

// ============================================================
// THROW MODAL - ported from design-drafts/throw-alerts-preview.html.
// Reuses .paper/.backdrop directly (own #throw-paper/#throw-backdrop
// pair, since the draw modal's own pair can be mid-animation at the
// same time in theory - guarded below so only one is ever open at
// once), grown from the nav's + button's own rect, same trick as
// openPaper() above and archive.js's card-expand.
// ============================================================
const throwOpenBtn = document.getElementById("add-btn");
const throwBackdrop = document.getElementById("throw-backdrop");
const throwPaper = document.getElementById("throw-paper");
const throwTextarea = document.getElementById("throw-textarea");
const throwCharCount = document.getElementById("throw-char-count");
const throwSubmitBtn = document.getElementById("throw-submit");
const throwCancelBtn = document.getElementById("throw-cancel");
const sealToggle = document.getElementById("seal-toggle");
const sealDateRow = document.getElementById("seal-date-row");
const sealDateInput = document.getElementById("seal-date");

let throwModalOpen = false;
let sealed = false;

const THROW_CHAR_LIMIT = 255; // CLAUDE.md's settled decision - not the draft's original 280

function tomorrowDateStr(){
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function updateThrowSubmitState(){
    const hasContent = throwTextarea.value.trim() !== "";
    const sealNeedsDate = sealed && sealDateInput.value === "";
    throwSubmitBtn.disabled = !hasContent || sealNeedsDate;
}

function openThrowModal(){
    if(throwModalOpen || grabbedSlot || drawInFlight) return; // one thing at a time

    throwModalOpen = true;
    sealDateInput.min = tomorrowDateStr();

    const rect = throwOpenBtn.getBoundingClientRect();
    throwPaper.style.transition = "none";
    throwPaper.style.left = rect.left + "px";
    throwPaper.style.top = rect.top + "px";
    throwPaper.style.width = rect.width + "px";
    throwPaper.style.height = rect.height + "px";
    throwPaper.offsetHeight; // force layout before re-enabling transitions
    throwPaper.style.transition = "";

    throwBackdrop.classList.add("open");
    throwPaper.classList.add("open");

    const w = Math.min(window.innerWidth * 0.9, 420);
    const h = Math.min(window.innerHeight * 0.7, 460);
    throwPaper.style.left = (window.innerWidth - w) / 2 + "px";
    throwPaper.style.top = (window.innerHeight - h) / 2 + "px";
    throwPaper.style.width = w + "px";
    throwPaper.style.height = h + "px";

    setTimeout(() => throwTextarea.focus(), 300);
}

function closeThrowModal(){
    if(!throwModalOpen) return;
    throwModalOpen = false;

    const rect = throwOpenBtn.getBoundingClientRect();
    throwBackdrop.classList.remove("open");
    throwPaper.classList.remove("open");
    throwPaper.style.left = rect.left + "px";
    throwPaper.style.top = rect.top + "px";
    throwPaper.style.width = rect.width + "px";
    throwPaper.style.height = rect.height + "px";
}

function resetThrowForm(){
    throwTextarea.value = "";
    throwCharCount.textContent = "0 / " + THROW_CHAR_LIMIT;
    throwCharCount.classList.remove("limit");
    sealed = false;
    sealToggle.classList.remove("on");
    sealDateRow.classList.remove("open");
    sealDateInput.value = "";
    updateThrowSubmitState();
}

throwOpenBtn.addEventListener("click", openThrowModal);
throwCancelBtn.addEventListener("click", closeThrowModal);
// same one-shot-action rule as the draw modal - an in-progress message
// is just as easy to lose by accident, so only Cancel/Throw close this
throwBackdrop.addEventListener("click", (e) => { e.stopPropagation(); });

throwTextarea.addEventListener("input", () => {
    const n = throwTextarea.value.length;
    throwCharCount.textContent = n + " / " + THROW_CHAR_LIMIT;
    throwCharCount.classList.toggle("limit", n >= THROW_CHAR_LIMIT - 20);
    updateThrowSubmitState();
});

sealToggle.addEventListener("click", () => {
    sealed = !sealed;
    sealToggle.classList.toggle("on", sealed);
    sealDateRow.classList.toggle("open", sealed);
    updateThrowSubmitState();
});

sealDateInput.addEventListener("change", updateThrowSubmitState);

throwSubmitBtn.addEventListener("click", () => {
    const content = throwTextarea.value;
    if(content.trim() === "") return; // guard only - button is disabled at 0 chars

    throwSubmitBtn.disabled = true;
    const body = new URLSearchParams();
    body.append("content", content);
    if(sealed && sealDateInput.value){
        body.append("unlocks_at", sealDateInput.value);
    }

    axios.post(BASE_URL + "throw.php", body).then((response) => {
        if(response.data.success){
            const wasSealed = sealed;
            closeThrowModal();
            showToast("success", wasSealed ? "Bottle sealed and set adrift." : "Your bottle is adrift.");
            // immediate refresh, same reasoning as the draw side above -
            // a newly-thrown bottle can now show up as someone else's
            // candidate without waiting for the next 90s poll
            fetchCandidates();
            setTimeout(resetThrowForm, 550); // let the shrink-down animation finish first
        } else {
            throwSubmitBtn.disabled = false;
            showToast("error", response.data.message);
        }
    }).catch((error) => {
        throwSubmitBtn.disabled = false;
        showToast("error", "Something went wrong throwing this bottle: " + error.message);
    });
});

// now that updateBottles/slots/pool all exist, start the shared
// wave+bottle animation loop (see the note above frame()'s definition).
//
// Under prefers-reduced-motion, a single frame(0) is NOT enough: bottle
// slots only ever get assigned/positioned/cycled from inside
// updateBottles(), which only runs from inside frame(). A one-shot
// frame(0) fires synchronously at load, before get_current_user.php ->
// get_ocean_candidates.php have had a chance to resolve (both async),
// so `pool` is still empty at that instant and every slot's
// `if(!slot.bottle){ if(pool.length === 0) return; ... }` bails out -
// with no further frames ever scheduled, no bottle is ever assigned,
// positioned, or clickable again. The whole game would be permanently
// empty for reduced-motion users, not just less animated.
//
// The actual draw/mark/report sequence doesn't depend on this loop at
// all (it's driven entirely by setTimeout and direct style writes), so
// the fix only needs to keep bottles appearing/cycling: a slow,
// infrequent interval instead of a smooth 60fps loop - "reduced
// motion" means no continuous animation, not "no ocean".
const REDUCED_MOTION_TICK_MS = 1500;

if(reduceMotion){
    frame(0);
    setInterval(() => updateBottles(performance.now(), REDUCED_MOTION_TICK_MS), REDUCED_MOTION_TICK_MS);
} else {
    requestAnimationFrame(frame);
}
