const grid = document.getElementById("grid");
const counts = document.getElementById("counts");

const now = new Date();
const fmt = (d) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const monthsAway = (d) => (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());

// populated once both fetches below resolve
let MINE = [];    // shown-in-grid bottles: active/completed/neglected, NOT sealed
let SEALED = [];  // sealed (unlocks_at in the future) - count/date only, never rendered as cards
let keptBottle = null;

function mapBottle(b){
    return {
        id: b.id,
        message: b.content,
        reason: b.retirement_reason || "active",
        holds: b.hold_count,
        marksText: b.marks,
        unlocksAt: b.unlocks_at ? new Date(b.unlocks_at) : null,
    };
}

function tagInfo(bottle){
    switch(bottle.reason){
        case "active": return { cls: "active", text: "Adrift" };
        case "completed": return { cls: "completed", text: `Completed · ${bottle.marksText.length} marks` };
        case "neglected": return { cls: "neglected", text: `Neglected${bottle.marksText.length ? ` · ${bottle.marksText.length} mark${bottle.marksText.length === 1 ? "" : "s"}` : ""}` };
        case "kept": return { cls: "kept", text: "Kept" };
    }
}

function renderCounts(){
    const activeCount = MINE.filter(b => b.reason === "active").length;
    const completedCount = MINE.filter(b => b.reason === "completed").length;
    const neglectedCount = MINE.filter(b => b.reason === "neglected").length;
    const sealedCount = SEALED.length;
    const parts = [`${activeCount} still adrift`, `${completedCount} completed`, `${neglectedCount} drifted off`];
    if(keptBottle) parts.push("1 kept");
    if(sealedCount) parts.push(`${sealedCount} sealed`);
    const total = MINE.length + (keptBottle ? 1 : 0) + sealedCount;
    counts.textContent = total === 0
        ? "You haven't thrown a bottle yet."
        : `${total} bottles thrown — ${parts.join(", ")}`;
}

function renderGrid(){
    grid.innerHTML = "";
    MINE.forEach(bottle => {
        const card = document.createElement("div");
        card.className = "card";
        const tag = tagInfo(bottle);
        const eligible = selecting && bottle.reason === "active";
        if(selecting && eligible) card.classList.add("selectable");

        const message = document.createElement("p");
        message.className = "card-message";
        message.textContent = bottle.message;
        card.appendChild(message);

        const meta = document.createElement("div");
        meta.className = "card-meta";
        const tagEl = document.createElement("span");
        tagEl.className = `status-tag ${tag.cls}`;
        tagEl.textContent = tag.text;
        meta.appendChild(tagEl);
        const holdsEl = document.createElement("span");
        holdsEl.className = "card-holds";
        holdsEl.textContent = `held ${bottle.holds} time${bottle.holds === 1 ? "" : "s"}`;
        meta.appendChild(holdsEl);
        card.appendChild(meta);

        const marksLabel = document.createElement("span");
        marksLabel.className = "paper-marks-label";
        marksLabel.textContent = "Marks";
        card.appendChild(marksLabel);

        const marksWrap = document.createElement("div");
        marksWrap.className = "paper-marks";
        if(bottle.marksText.length === 0){
            marksWrap.appendChild(createMarkElement("No marks yet.", "paper-mark none"));
        } else {
            bottle.marksText.forEach(m => marksWrap.appendChild(createMarkElement(m, "paper-mark")));
        }
        card.appendChild(marksWrap);

        if(eligible){
            const hint = document.createElement("span");
            hint.className = "select-hint";
            hint.textContent = "Tap to keep this one";
            card.appendChild(hint);
            card.addEventListener("click", () => confirmKeep(bottle, card));
        }

        grid.appendChild(card);
    });
    grid.classList.toggle("selecting", selecting);
}

function loadDashboard(){
    return Promise.all([
        axios.get(BASE_URL + "get_dashboard.php"),
        axios.get(BASE_URL + "get_shelf.php"),
    ]).then(([dashRes, shelfRes]) => {
        const all = dashRes.data.data.map(mapBottle);
        MINE = all.filter(b => !(b.unlocksAt && b.unlocksAt > now));
        SEALED = all.filter(b => b.unlocksAt && b.unlocksAt > now);
        keptBottle = shelfRes.data.data ? mapBottle(shelfRes.data.data) : null;
        if(keptBottle) keptBottle.reason = "kept";

        document.getElementById("shelf-dot").style.display = keptBottle ? "inline-block" : "none";
        document.getElementById("sealed-dot").style.display = SEALED.length ? "inline-block" : "none";

        renderCounts();
        renderGrid();
    }).catch((error) => {
        showToast("error", "Something went wrong loading your dashboard: " + error.message);
    });
}

loadDashboard();

// ============================================================
// KEEP-SELECTION MODE
// ============================================================
let selecting = false;
const selectBanner = document.getElementById("select-banner");

function startSelecting(){
    closePopover();
    selecting = true;
    selectBanner.classList.add("open");
    renderGrid();
}

function stopSelecting(){
    selecting = false;
    selectBanner.classList.remove("open");
    renderGrid();
}

function confirmKeep(bottle, card){
    // a real polished build would use an in-world confirm dialog rather
    // than the browser's own confirm() - the choice logic is the point
    // here, not the confirm chrome
    const excerpt = bottle.message.length > 60 ? bottle.message.slice(0, 60) + "…" : bottle.message;
    if(!window.confirm(`Keep "${excerpt}" forever? This can only be done once, and it leaves circulation immediately.`)) return;

    card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    card.style.opacity = "0";
    card.style.transform = "translateY(-6px) scale(0.94)";

    const body = new URLSearchParams();
    body.append("bottle_id", bottle.id);

    axios.post(BASE_URL + "keep.php", body).then((response) => {
        if(!response.data.success){
            showToast("error", response.data.message);
            card.style.opacity = "";
            card.style.transform = "";
            return;
        }

        setTimeout(() => {
            stopSelecting();
            loadDashboard().then(() => {
                showToast("success", "Bottle kept!");
                popoverOpen = "shelf";
                renderShelfPopover();
            });
        }, 260);
    }).catch((error) => {
        showToast("error", "Something went wrong keeping this bottle: " + error.message);
        card.style.opacity = "";
        card.style.transform = "";
    });
}

document.getElementById("select-cancel").addEventListener("click", stopSelecting);

// ============================================================
// POPOVER (Shelf / Sealed)
// ============================================================
const popoverBackdrop = document.getElementById("popover-backdrop");
const popover = document.getElementById("popover");
const popoverContent = document.getElementById("popover-content");
const shelfBtn = document.getElementById("shelf-btn");
const sealedBtn = document.getElementById("sealed-btn");

let popoverOpen = null; // "shelf" | "sealed" | null

function measureHeight(html, paper, targetW){
    const wrap = document.createElement("div");
    wrap.className = "popover " + (paper ? "paper" : "glass");
    Object.assign(wrap.style, {
        position: "fixed", left: "-9999px", top: "0",
        width: targetW + "px", height: "auto",
        opacity: "1", visibility: "hidden", pointerEvents: "none", transition: "none",
    });
    const content = document.createElement("div");
    content.className = "popover-content";
    content.style.position = "static";
    content.style.opacity = "1";
    content.innerHTML = html;
    wrap.appendChild(content);
    document.body.appendChild(wrap);
    const measured = wrap.scrollHeight;
    document.body.removeChild(wrap);
    return measured;
}

function openPopoverFrom(btn, html, { paper = false, w = 300 } = {}){
    const rect = btn.getBoundingClientRect();
    popover.classList.toggle("paper", paper);
    popover.classList.toggle("glass", !paper);
    popoverContent.innerHTML = html;

    popover.style.transition = "none";
    popover.style.left = rect.left + "px";
    popover.style.top = rect.bottom + 8 + "px";
    popover.style.width = rect.width + "px";
    popover.style.height = "0px";
    popover.offsetHeight;
    popover.style.transition = "";

    popoverBackdrop.classList.add("open");
    popover.classList.add("open");

    const targetW = Math.min(w, window.innerWidth * 0.9);
    const targetH = Math.min(measureHeight(html, paper, targetW), window.innerHeight * 0.6);
    let left = rect.left;
    if(left + targetW > window.innerWidth - 16) left = window.innerWidth - targetW - 16;
    popover.style.left = left + "px";
    popover.style.top = (rect.bottom + 10) + "px";
    popover.style.width = targetW + "px";
    popover.style.height = targetH + "px";
}

function closePopover(){
    if(!popoverOpen) return;
    const btn = popoverOpen === "shelf" ? shelfBtn : sealedBtn;
    const rect = btn.getBoundingClientRect();
    popoverBackdrop.classList.remove("open");
    popover.classList.remove("open");
    popover.style.left = rect.left + "px";
    popover.style.top = rect.bottom + 8 + "px";
    popover.style.width = rect.width + "px";
    popover.style.height = "0px";
    popoverOpen = null;
}

function renderShelfPopover(){
    if(keptBottle){
        const marksBlock =
            `<span class="paper-marks-label">Marks</span>
             <div class="paper-marks">
               ${keptBottle.marksText.length
                 ? keptBottle.marksText.map(m => `<div class="paper-mark">${m}</div>`).join("")
                 : `<div class="paper-mark none">No marks yet.</div>`}
             </div>`;
        const html =
            `<p class="popover-message">${keptBottle.message}</p>` +
            `<div class="card-meta"><span class="status-tag kept">Kept</span><span class="card-holds">held ${keptBottle.holds} time${keptBottle.holds === 1 ? "" : "s"}</span></div>` +
            marksBlock +
            `<button class="popover-close" id="shelf-close">Close</button>`;
        openPopoverFrom(shelfBtn, html, { paper: true, w: 300 });
    } else {
        const html =
            `<span class="popover-title">Your shelf is empty</span>` +
            `<p class="popover-text">Once, and only once, you can pull one of your own bottles out of circulation early and keep it here for good. It won't be drawn, marked, or archived - just yours.</p>` +
            `<button class="popover-cta" id="keep-cta">Keep a Bottle</button>`;
        openPopoverFrom(shelfBtn, html, { paper: false, w: 300 });
    }
}

function renderSealedPopover(){
    let html;
    if(SEALED.length === 0){
        html = `<span class="popover-title">No sealed bottles</span><p class="popover-text">Bottles you seal with a future unlock date will show up here, counted down without revealing them.</p>`;
    } else {
        const rows = SEALED
            .slice()
            .sort((a, b) => a.unlocksAt - b.unlocksAt)
            .map((s, i) => `<div class="sealed-row"><span>#${i + 1}</span><span class="when">in ${monthsAway(s.unlocksAt)} months · ${fmt(s.unlocksAt)}</span></div>`)
            .join("");
        html =
            `<span class="popover-title">${SEALED.length} bottle${SEALED.length === 1 ? "" : "s"} sealed</span>` +
            `<p class="popover-text">They'll unlock and re-enter circulation on their own - nothing to do until then.</p>` +
            rows;
    }
    openPopoverFrom(sealedBtn, html, { paper: false, w: 300 });
}

shelfBtn.addEventListener("click", () => {
    if(popoverOpen === "shelf"){ closePopover(); return; }
    popoverOpen = "shelf";
    renderShelfPopover();
});
sealedBtn.addEventListener("click", () => {
    if(popoverOpen === "sealed"){ closePopover(); return; }
    popoverOpen = "sealed";
    renderSealedPopover();
});
popoverBackdrop.addEventListener("click", closePopover);

popoverContent.addEventListener("click", (e) => {
    if(e.target.id === "keep-cta") startSelecting();
    if(e.target.id === "shelf-close") closePopover();
});
