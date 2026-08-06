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
