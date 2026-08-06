const grid = document.getElementById("grid");
const counts = document.getElementById("counts");

// split from the old single tagText() string so the pill can wrap just
// the status word - the mark count sits next to it as plain text
// instead of being inside (and widening) the pill
function statusLabel(bottle){
    return bottle.retirement_reason === "completed" ? "Completed" : "Neglected";
}

function marksCountText(bottle){
    const n = bottle.marks.length;
    if(n === 0) return ""; // a freshly-neglected bottle can have 0 marks - nothing to show
    return `${n} mark${n === 1 ? "" : "s"}`;
}

// builds <span class="status-tag ...">Label</span> + an optional plain-
// text mark count next to it, wrapped in one inline row
function buildStatusRow(bottle, tagId, metaId){
    const row = document.createElement("div");
    row.className = "status-row";

    const tag = document.createElement("span");
    tag.className = `status-tag ${bottle.retirement_reason}`;
    tag.textContent = statusLabel(bottle);
    if(tagId) tag.id = tagId;
    row.appendChild(tag);

    const marksText = marksCountText(bottle);
    if(marksText){
        const meta = document.createElement("span");
        meta.className = "status-meta";
        meta.textContent = marksText;
        if(metaId) meta.id = metaId;
        row.appendChild(meta);
    }

    return row;
}

axios.get(BASE_URL + "get_archive.php").then((response) => {
    const bottles = response.data.data;

    if(bottles.length === 0){
        counts.textContent = "Nothing has left circulation yet.";
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "The archive is empty for now - come back once some bottles have run their course.";
        grid.replaceWith(empty);
        return;
    }

    const completedCount = bottles.filter(b => b.retirement_reason === "completed").length;
    const neglectedCount = bottles.filter(b => b.retirement_reason === "neglected").length;
    counts.textContent = `${bottles.length} bottles have left circulation — ${completedCount} completed, ${neglectedCount} drifted off unanswered`;

    bottles.forEach(bottle => {
        const card = document.createElement("div");
        card.className = "card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");

        const message = document.createElement("p");
        message.className = "card-message";
        message.textContent = bottle.content;
        card.appendChild(message);

        card.appendChild(buildStatusRow(bottle));

        card.addEventListener("click", () => expandCard(card, bottle));
        card.addEventListener("keydown", (e) => {
            if(e.key === "Enter" || e.key === " "){
                e.preventDefault();
                expandCard(card, bottle);
            }
        });

        grid.appendChild(card);
    });
}).catch((error) => {
    showToast("error", "Something went wrong loading the archive: " + error.message);
});

// ============================================================
// EXPAND / COLLAPSE - the clicked card grows in place into the same
// paper the draw modal uses (styles/components.css .paper), anchored
// to its own on-screen rect at the moment of the click, so it reads as
// "this card became the window" rather than a generic modal popping up
// over it. Read-only - no textarea/Report/Post, since nothing here can
// be acted on.
// ============================================================
const backdrop = document.getElementById("backdrop");
const paper = document.getElementById("paper");
const paperMessage = document.getElementById("paper-message");
const paperMarks = document.getElementById("paper-marks");
const paperStatusRow = document.getElementById("paper-status-row");
const paperClose = document.getElementById("paper-close");

let activeCard = null;

function expandCard(card, bottle){
    if(activeCard) return; // one at a time
    activeCard = card;

    const rect = card.getBoundingClientRect();

    paperMessage.textContent = bottle.content;
    paperStatusRow.innerHTML = "";
    paperStatusRow.appendChild(buildStatusRow(bottle));
    paperMarks.innerHTML = "";
    if(bottle.marks.length === 0){
        const none = document.createElement("div");
        none.className = "paper-mark none";
        none.textContent = "No marks were left on this one.";
        paperMarks.appendChild(none);
    } else {
        bottle.marks.forEach((markText) => {
            paperMarks.appendChild(createMarkElement(markText, "paper-mark"));
        });
    }

    paper.style.transition = "none";
    paper.style.left = rect.left + "px";
    paper.style.top = rect.top + "px";
    paper.style.width = rect.width + "px";
    paper.style.height = rect.height + "px";
    paper.offsetHeight; // force layout before re-enabling transitions
    paper.style.transition = "";

    card.classList.add("expanding");
    backdrop.classList.add("open");
    paper.classList.add("open");

    // grow to the same centered size as the draw modal
    const w = Math.min(window.innerWidth * 0.9, 420);
    const h = Math.min(window.innerHeight * 0.7, 460);
    paper.style.left = (window.innerWidth - w) / 2 + "px";
    paper.style.top = (window.innerHeight - h) / 2 + "px";
    paper.style.width = w + "px";
    paper.style.height = h + "px";
}

function collapseCard(){
    if(!activeCard) return;
    const card = activeCard;
    const rect = card.getBoundingClientRect();

    backdrop.classList.remove("open");
    paper.classList.remove("open");
    paper.style.left = rect.left + "px";
    paper.style.top = rect.top + "px";
    paper.style.width = rect.width + "px";
    paper.style.height = rect.height + "px";

    setTimeout(() => {
        card.classList.remove("expanding");
        activeCard = null;
    }, 500);
}

paperClose.addEventListener("click", (e) => { e.stopPropagation(); collapseCard(); });
// re-opening an archived bottle is harmless (unlike the draw modal, this
// isn't a one-shot action to protect), so the backdrop click IS wired
// to close here
backdrop.addEventListener("click", collapseCard);
