// WELCOME MESSAGE
const welcomeMsg = document.getElementById("welcome-msg");
let canThrow = true;

axios.get(BASE_URL + "get_current_user.php").then((response) => {
    welcomeMsg.textContent = "Welcome, " + response.data.data.display_name;
    canThrow = response.data.data.can_throw;
}).catch((error) => {
    alert("Something went wrong loading your account: " + error.message);
});


// THROW MODAL: open and close buttons
const addBtn = document.getElementById("add-btn");
const cancelBtn = document.getElementById("cancel-btn");
const throwModal = document.getElementById("throw-modal");

function handleAddClick(){
    if(canThrow) {
        openModal(throwModal);
    } else {
        alert("You've already thrown 3 bottles today!");
    }
}
addBtn.addEventListener("click", handleAddClick);

function handleCancelClick(){
    closeModal(throwModal);
}
cancelBtn.addEventListener("click", handleCancelClick);


// THROW MODAL: character count
const throwTextArea = document.getElementById("throw-textarea");
const throwCharCount = document.getElementById("throw-char-count");

function handleThrowInput(){
    throwCharCount.textContent = throwTextArea.value.length;
}
throwTextArea.addEventListener("input", handleThrowInput);


// THROW MODAL: throw button
const throwBtn = document.getElementById("throw-btn");

function handleThrowClick(){
    const body = new URLSearchParams();
    body.append("content", throwTextArea.value);

    axios.post(BASE_URL + "throw.php", body).then((response) => {
        if(response.data.success) {
            closeModal(throwModal);
            throwTextArea.value = "";
            throwCharCount.textContent = "0";
        } else{
            alert(response.data.message);
        }
    }).catch((error) => {
        alert("Something went wrong throwing this bottle: " + error.message);
    });
}
throwBtn.addEventListener("click", handleThrowClick);


// DRAW MODAL: open and close buttons
const bottleCard = document.querySelectorAll(".bottle-card");
const drawModal = document.getElementById("draw-modal");
const closeBtn = document.getElementById("close-bottle-btn");
const bottleContent = document.getElementById("bottle-content");
const marksList = document.getElementById("marks-list");

let currentBottleId = null;

function handleBottleCardClick(){
    axios.get(BASE_URL + "draw.php").then((response) => {
        if(!response.data.success){
            if(response.data.message === "Throw a bottle first!"){
                alert("Throw a bottle first!");
            } else{
                alert(response.data.message);
            }
            return;
        }

        currentBottleId = response.data.data.bottle.id;
        bottleContent.textContent = response.data.data.bottle.content;

        marksList.innerHTML = "";
        response.data.data.marks.forEach((markText) => {
            marksList.appendChild(createMarkElement(markText));
        });

        openModal(drawModal);
    }).catch((error) => {
        alert("Something went wrong drawing a bottle: " + error.message);
    });
}
bottleCard.forEach(card => {
    card.addEventListener("click", handleBottleCardClick);
});

function handleCloseClick(){
    closeModal(drawModal);
}
closeBtn.addEventListener("click", handleCloseClick);


// DRAW MODAL: character count
const markTextArea = document.getElementById("mark-textarea");
const markCharCount = document.getElementById("mark-char-count");

function handleMarkInput(){
    markCharCount.textContent = markTextArea.value.length;
}
markTextArea.addEventListener("input", handleMarkInput);


// DRAW MODAL: post button
const postBtn = document.getElementById("post-mark-btn");

function handlePostClick(){
    const body = new URLSearchParams();
    body.append("bottle_id", currentBottleId);
    body.append("content", markTextArea.value);

    axios.post(BASE_URL + "mark.php", body).then((response) => {
        if(response.data.success){
            closeModal(drawModal);
            markTextArea.value = "";
            markCharCount.textContent = "0";
        } else{
            alert(response.data.message);
        }
    }).catch((error) => {
        alert("Something went wrong posting this mark: " + error.message);
    });
}
postBtn.addEventListener("click", handlePostClick);


// DRAW MODAL: report button
const reportBtn = document.getElementById("report-btn");

function handleReportClick(){
    if(!confirm("Are you sure you want to report this bottle?")){
        return;
    }

    const body = new URLSearchParams();
    body.append("bottle_id", currentBottleId);

    axios.post(BASE_URL + "report.php", body).then((response) => {
        alert(response.data.message);
        closeModal(drawModal);
    }).catch((error) => {
        alert("Something went wrong reporting this bottle: " + error.message);
    });
}
reportBtn.addEventListener("click", handleReportClick);