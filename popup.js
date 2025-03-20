// Add this to your existing logout button click handler
const logoutButtonStates = {
    'default': {
        '--figure-duration': '100',
        '--transform-figure': 'none',
        // ... rest of the states
    },
    // ... rest of the states object
};

document.querySelector('.logoutButton').addEventListener('click', async (e) => {
    const button = e.currentTarget;

    // Trigger animation
    button.classList.add('clicked');
    updateButtonState(button, 'walking1');

    // Your existing logout logic
    try {
        await chrome.runtime.sendMessage({ action: "logout" });
        // Wait for animation to complete before redirecting
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

// Add the animation helper function
function updateButtonState(button, state) {
    if (logoutButtonStates[state]) {
        button.state = state;
        for (let key in logoutButtonStates[state]) {
            button.style.setProperty(key, logoutButtonStates[state][key]);
        }
    }
}