// Add this to content-script.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractContent") {
        try {
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();

            if (!article || !article.textContent) {
                const fallbackContent = document.body ? document.body.innerText : "";
                if (fallbackContent.trim().length === 0) {
                    sendResponse({ error: 'No readable content found' });
                    return;
                } else {
                    sendResponse({ content: fallbackContent });
                    return;
                }
            }

            sendResponse({ content: article.textContent });
        } catch (e) {
            sendResponse({ error: e.message });
        }
    }
});