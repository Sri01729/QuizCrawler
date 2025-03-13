let questions = []; // Global variable to hold quiz data

document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.getElementById('quiz-container');

    const toggleConfigBtn = document.getElementById('toggle-config');
    const configWrapper = document.querySelector('.config-wrapper');

    toggleConfigBtn.addEventListener('click', function () {
        configWrapper.classList.toggle('collapsed');
        toggleConfigBtn.classList.toggle('collapsed');

        // Save the state to localStorage
        localStorage.setItem('configCollapsed', configWrapper.classList.contains('collapsed'));
    });

    // Utility function to clean API response by removing markdown code fences
    function cleanApiResponse(response) {
        return response.replace(/```json\s*([\s\S]*?)\s*```/m, '$1').trim();
    }

    // Function to display the generated quiz questions
    function displayQuiz(receivedQuestions) {
        questions = receivedQuestions; // Store globally
        quizContainer.innerHTML = questions.map((q, i) => `
      <div class="question">
        <h3>Question ${i + 1}</h3>
        <p>${q.question}</p>
        ${q.options ? q.options.map((o, idx) => `
          <div class="option">${String.fromCharCode(65 + idx)}) ${o}</div>
        `).join('') : ''}
        <div class="answer" style="display: none;">Answer: ${q.answer}</div>
        ${q.answer ? '<button class="reveal-answer">Show Answer</button>' : ''}
      </div>
    `).join('');

        // Add functionality for "Show Answer" buttons
        document.querySelectorAll('.reveal-answer').forEach(button => {
            button.addEventListener('click', (e) => {
                e.target.previousElementSibling.style.display = 'block';
                e.target.remove();
            });
        });

        // Save quiz to chrome.storage so it can be reloaded later if needed
        chrome.storage.local.set({ lastQuiz: { questions, quizHTML: quizContainer.innerHTML } });
    }

    // Attempt to load any saved quiz when the popup opens
    chrome.storage.local.get('lastQuiz', (data) => {
        if (data.lastQuiz && data.lastQuiz.quizHTML) {
            quizContainer.innerHTML = data.lastQuiz.quizHTML;
            questions = data.lastQuiz.questions;
            // Rebind "Show Answer" functionality
            document.querySelectorAll('.reveal-answer').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.target.previousElementSibling.style.display = 'block';
                    e.target.remove();
                });
            });
        }
    });

    // Event listener for the Generate Quiz button
    document.getElementById('generate-btn').addEventListener('click', async () => {
        try {
            // Query for the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found');

            // Send a message to the content script to extract page content
            const response = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" });
            if (!response || !response.content) throw new Error('Failed to extract page content');

            // Prepare payload for the API call
            const payload = {
                content: response.content.substring(0, 12000), // Limit content length
                difficulty: document.getElementById('difficulty').value,
                category: document.getElementById('category').value,
                count: document.getElementById('count').value
            };

            // Set a timeout to avoid waiting indefinitely
            const timeout = setTimeout(() => {
                quizContainer.innerHTML = '<div class="error">Request timed out (30s)</div>';
            }, 30000);

            // Send a message to the background script to generate the quiz
            chrome.runtime.sendMessage({ action: "generateQuiz", payload }, (apiResponse) => {
                clearTimeout(timeout);
                try {
                    if (!apiResponse) {
                        throw new Error('Empty response from API');
                    }
                    // Clean and parse the API response
                    const cleanedResponse = cleanApiResponse(apiResponse);
                    const parsed = JSON.parse(cleanedResponse);

                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                    if (!Array.isArray(parsed)) {
                        throw new Error('Invalid question format received');
                    }
                    // Display the quiz questions
                    displayQuiz(parsed);
                } catch (e) {
                    console.error('Processing Error:', e);
                    quizContainer.innerHTML = `<div class="error">Error: ${e.message}</div>`;
                }
            });
        } catch (e) {
            console.error('General Error:', e);
            quizContainer.innerHTML = `<div class="error">Error: ${e.message}</div>`;
        }
    });

    // Save button handler (already implemented)
    document.getElementById('save-btn').addEventListener('click', () => {
        const quizData = {
            questions: questions,
            quizHTML: quizContainer.innerHTML
        };
        chrome.storage.local.set({ lastQuiz: quizData });
        alert('Quiz saved successfully!');
    });

    // Export JSON functionality remains unchanged
    document.getElementById('export-json').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url, filename: `quiz_${Date.now()}.json` });
    });

    // Updated copy functionality to always include both questions and answers
    document.getElementById('copy-clipboard').addEventListener('click', () => {
        // Build a text that includes both questions and answers from the stored data
        const allText = questions.map((q, i) => {
            let text = `Question ${i + 1}: ${q.question}\n`;
            if (q.options && q.options.length) {
                text += `Options: ${q.options.join(', ')}\n`;
            }
            text += `Answer: ${q.answer}`;
            return text;
        }).join('\n\n');
        navigator.clipboard.writeText(allText);
        alert('Questions and answers copied to clipboard!');
    });

    // New Clear button functionality: clears the quiz and stored data
    document.getElementById('clear-btn').addEventListener('click', () => {
        // Clear the displayed quiz
        quizContainer.innerHTML = '';
        // Reset the global questions variable
        questions = [];
        // Remove saved quiz from chrome storage
        chrome.storage.local.remove('lastQuiz', () => {
            alert('Quiz cleared!');
        });
    });
});
