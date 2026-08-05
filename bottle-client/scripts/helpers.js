function openModal(modal){
    modal.classList.remove("hidden");
}

function closeModal(modal){
    modal.classList.add("hidden");
}

function createMarkElement(text){
    const mark = document.createElement("p");
    mark.classList.add("mark");
    mark.textContent = text;
    return mark;
}
