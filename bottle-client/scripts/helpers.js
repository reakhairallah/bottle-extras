// className defaults to "mark" (the original Phase 1 style, from the
// pre-integration app.js/style.css - since deleted, both fully
// superseded by game.js/components.css's .paper); every current call
// site passes "paper-mark" explicitly instead, for the shared paper
// material. Split on whitespace before handing to classList.add() - a
// compound className like "paper-mark none" (dashboard.js's empty-marks
// case) is a single space-containing string, and classList.add() throws
// on any token containing a space unless each class is its own argument.
function createMarkElement(text, className = "mark"){
    const mark = document.createElement("p");
    mark.classList.add(...className.split(" "));
    mark.textContent = text;
    return mark;
}

// shared toast (styles/components.css .toast-stack/.toast) - any page
// that wants toasts just needs a `<div class="toast-stack" id="toast-
// stack">` in its markup and this script included. kind is "success"
// or "error". No-ops quietly if the page has no toast-stack, rather
// than throwing, since not every page needs this.
function showToast(kind, message){
    const stack = document.getElementById("toast-stack");
    if(!stack) return;

    const el = document.createElement("div");
    el.className = `toast ${kind}`;

    const text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);

    const dismissBtn = document.createElement("button");
    dismissBtn.className = "toast-dismiss";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.textContent = "×";
    el.appendChild(dismissBtn);

    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));

    const dismiss = () => {
        el.classList.remove("in");
        setTimeout(() => el.remove(), 300);
    };
    dismissBtn.addEventListener("click", dismiss);
    setTimeout(dismiss, 3800);
}

// shared glass confirm dialog (styles/components.css .confirm-box) -
// replaces the native window.confirm()'s unstyled "localhost says"
// chrome. Any page that wants this needs the shared markup once:
//   <div class="backdrop" id="confirm-backdrop"></div>
//   <div class="confirm-box" id="confirm-box">
//     <p class="confirm-message" id="confirm-message"></p>
//     <div class="confirm-actions">
//       <button class="paper-link-btn" id="confirm-cancel">Cancel</button>
//       <button class="paper-primary-btn" id="confirm-ok">Confirm</button>
//     </div>
//   </div>
// Returns a Promise<boolean> so a call site reads almost identically to
// the confirm() it replaces: `if(!(await confirmDialog(msg))) return;`.
// No-ops quietly (resolves false) if the page lacks the markup, same
// defensive pattern as showToast - not every page needs this.
function confirmDialog(message, okLabel = "Confirm"){
    const backdrop = document.getElementById("confirm-backdrop");
    const box = document.getElementById("confirm-box");
    const messageEl = document.getElementById("confirm-message");
    const cancelBtn = document.getElementById("confirm-cancel");
    const okBtn = document.getElementById("confirm-ok");
    if(!backdrop || !box || !messageEl || !cancelBtn || !okBtn) return Promise.resolve(false);

    messageEl.textContent = message;
    okBtn.textContent = okLabel;
    backdrop.classList.add("open");
    box.classList.add("open");

    return new Promise((resolve) => {
        function close(result){
            backdrop.classList.remove("open");
            box.classList.remove("open");
            cancelBtn.removeEventListener("click", onCancel);
            okBtn.removeEventListener("click", onOk);
            backdrop.removeEventListener("click", onCancel);
            resolve(result);
        }
        function onCancel(){ close(false); }
        function onOk(){ close(true); }
        cancelBtn.addEventListener("click", onCancel);
        okBtn.addEventListener("click", onOk);
        // unlike the draw/throw modal's backdrop, a yes/no prompt has no
        // typed content to protect - dismissing it is harmless, so the
        // backdrop click cancels instead of being inert
        backdrop.addEventListener("click", onCancel);
    });
}
