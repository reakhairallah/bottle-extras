function openModal(modal){
    modal.classList.remove("hidden");
}

function closeModal(modal){
    modal.classList.add("hidden");
}

// className defaults to "mark" (the original Phase 1 style) so every
// existing call site (app.js, dashboard.js) is untouched - new pages
// that use the shared paper material (styles/components.css) pass
// "paper-mark" explicitly instead.
function createMarkElement(text, className = "mark"){
    const mark = document.createElement("p");
    mark.classList.add(className);
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
