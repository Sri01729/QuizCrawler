chrome.action.onClicked.addListener(async (tab) => {
    // First reload the tab
    await chrome.tabs.reload(tab.id);

    // Wait a bit for the page to load, then show sidebar
    setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
    }, 2000); // Wait 1 second after reload
});