let sidebarInjected = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSidebar") {
        if (!sidebarInjected) {
            injectSidebar();
            sidebarInjected = true;
        } else {
            const sidebar = document.getElementById('quiz-crawler-sidebar');
            sidebar.classList.toggle('collapsed');
            updateToggleIcon();
        }
    }

    if (request.action === "extractContent") {
        try {
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();

            sendResponse({
                content: article ? article.textContent : document.body.innerText
            });
        } catch (error) {
            sendResponse({
                error: "Failed to extract content: " + error.message
            });
        }
        return true;
    }
});

function updateToggleIcon() {
    const sidebar = document.getElementById('quiz-crawler-sidebar');
    const toggleIcon = document.querySelector('.toggle-icon');
    toggleIcon.innerHTML = sidebar.classList.contains('collapsed') ? '&#9654;' : '&#9664;';
}

function injectSidebar() {
    const sidebarHTML = `
        <div id="quiz-crawler-sidebar" class="quiz-crawler-sidebar">
            <div id="quiz-crawler-toggle" class="quiz-crawler-toggle">
                <span class="toggle-icon">&#9664;</span>
            </div>
            <iframe id="quiz-crawler-frame" src="${chrome.runtime.getURL('popup.html')}" frameborder="0"></iframe>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', sidebarHTML);

    const toggleButton = document.getElementById('quiz-crawler-toggle');
    toggleButton.addEventListener('click', () => {
        document.getElementById('quiz-crawler-sidebar').classList.toggle('collapsed');
        updateToggleIcon();
    });
}