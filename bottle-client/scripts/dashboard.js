const dashboardList = document.getElementById("dashboard-list");

axios.get(BASE_URL + "get_dashboard.php").then((response) => {
    response.data.data.forEach((bottle) => {
        const entry = document.createElement("div");
        entry.classList.add("bottle-entry");

        const content = document.createElement("p");
        content.classList.add("bottle-content");
        content.textContent = bottle.content;
        entry.appendChild(content);

        const info = document.createElement("div");
        info.classList.add("bottle-info");

        const marksCount = document.createElement("span");
        marksCount.textContent = bottle.marks.length + " mark(s)";
        info.appendChild(marksCount);

        const holdCount = document.createElement("span");
        holdCount.textContent = "Held " + bottle.hold_count + " time(s)";
        info.appendChild(holdCount);

        entry.appendChild(info);

        const marksList = document.createElement("div");
        marksList.classList.add("marks-list");

        bottle.marks.forEach((markText) => {
            marksList.appendChild(createMarkElement(markText));
        });

        entry.appendChild(marksList);

        dashboardList.appendChild(entry);
    });
}).catch((error) => {
    alert("Something went wrong loading your dashboard: " + error.message);
});
