import process from 'process/browser';
import mermaid from 'mermaid';
// Import a syntax highlighting library
import Prism from 'prismjs';
// Import basic language support
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/themes/prism-okaidia.css'; // Import a theme - change as needed

window.process = process;

// Initialize mermaid with proper configuration
mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true, // Better compatibility
        curve: 'linear'
    },
    theme: 'forest',
    logLevel: 0 // Enable error logging
});

let questions = []; // Global variable to hold quiz data

// Add this variable at the top of your file to track authentication state
let isAuthenticating = false;

// Helper function to detect language from code snippet
function detectLanguage(code) {
    // Simple detection - can be improved
    if (code.includes('def ') || code.includes('import ') && code.includes(':')) return 'python';
    if (code.includes('function') || code.includes('const ') || code.includes('let ') || code.includes('var ')) return 'javascript';
    if (code.includes('class') && code.includes('{') && code.includes('public')) return 'java';
    if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'markup';
    if (code.includes('.class') || code.includes('#id') && !code.includes('function')) return 'css';
    if (code.includes('using System') || code.includes('namespace')) return 'csharp';
    return 'javascript'; // Default
}

// Function to format code in answers
function formatCodeInAnswer(answer) {
    const codeRegex = /~~~(\w*)\s*([\s\S]*?)~~~/g;
    return answer.replace(codeRegex, (match, language, code) => {
        const lang = language || detectLanguage(code);

        try {
            // Prism.highlightAll is not a function - it highlights all elements on the page
            // Instead, use Prism.highlight which returns a string
            const highlighted = Prism.highlight(
                code,
                Prism.languages[lang] || Prism.languages.javascript,
                lang
            );
            return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
        } catch (e) {
            console.error('Error highlighting code:', e);
            return `<pre class="code-block"><code>${code}</code></pre>`;
        }
    });
}

// New: Function to safely compare answers
function isCorrectAnswer(optionText, answerText) {
    // Strip ALL HTML tags and normalize whitespace
    const cleanOption = optionText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const cleanAnswer = answerText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return cleanOption === cleanAnswer;
}



document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.getElementById('quiz-container');
    const toggleConfigBtn = document.getElementById('toggle-config');
    const configWrapper = document.querySelector('.config-wrapper');
    const refreshBtn = document.getElementById('refresh-btn');
    // const maximizeBtn = document.getElementById('maximize-btn');

    // Check if opened in maximized mode
    if (window.location.hash === '#maximized') {
        const savedState = localStorage.getItem('quizState');
        if (savedState) {
            const state = JSON.parse(savedState);
            questions = state.questions;
            quizContainer.innerHTML = state.html;
            rebindEventListeners();
        }
    }

    function rebindEventListeners() {
        // Re-attach all event listeners (your existing displayQuiz handlers)
        quizContainer.querySelectorAll('.toggle-answer').forEach(button => {
            button.addEventListener('click', handleAnswerToggle);
        });

        quizContainer.querySelectorAll('.toggle-diagram').forEach(button => {
            button.addEventListener('click', handleDiagramToggle);
        });
    }


    refreshBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                chrome.tabs.reload(tab.id);
            } else {
                console.error('No active tab found.');
            }
        } catch (error) {
            console.error('Error refreshing the page:', error);
        }
    });


    toggleConfigBtn.addEventListener('click', function () {
        configWrapper.classList.toggle('collapsed');
        toggleConfigBtn.classList.toggle('collapsed');
        localStorage.setItem('configCollapsed', configWrapper.classList.contains('collapsed'));
    });

    // Utility function to clean API response by removing markdown code fences
    function cleanApiResponse(response) {
        return response.replace(/```json\s*([\s\S]*?)\s*```/m, '$1').trim();
    }

    // Function to safely render mermaid diagrams
    // Add these functions at the top of your file
    function sanitizeMermaidCode(code) {
        return code
            // Escape special characters
            .replace(/\(/g, '&#40;')   // Escape (
            .replace(/\)/g, '&#41;')   // Escape )
            .replace(/{/g, '&#123;')    // Escape {
            .replace(/}/g, '&#125;')    // Escape }
            // Fix node formatting
            .replace(/\[([^\]]+)\]/g, '["$1"]') // Wrap labels in quotes
            // Fix arrow syntax
            .replace(/--\s?>/g, '-->')  // Ensure proper arrow format
            .replace(/\s-\s*$/gm, '');   // Remove trailing dashes
    }

    function validateMermaidSyntax(code) {
        const errors = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            if (/(\w+)\s-$/.test(line)) {
                errors.push(`Line ${index + 1}: Incomplete arrow syntax`);
            }
            if (/\[[^\]]+$/.test(line)) {
                errors.push(`Line ${index + 1}: Unclosed node bracket`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Update your existing render function
    async function renderMermaidDiagram(container, diagramCode) {
        try {
            const cleanCode = sanitizeMermaidCode(diagramCode);
            const validation = validateMermaidSyntax(cleanCode);

            if (!validation.valid) {
                throw new Error(`Diagram validation failed:\n${validation.errors.join('\n')}`);
            }

            const { svg } = await mermaid.render(
                `mermaid-${Date.now()}`,
                cleanCode
            );
            container.innerHTML = svg;
        } catch (error) {
            console.error('Mermaid render error:', error);
            container.innerHTML = `
            <div class="error">
                <strong>Diagram Error:</strong> ${error.message.split('\n')[0]}
                <pre>Original Code:\n${diagramCode}\n\nSanitized Code:\n${cleanCode}</pre>
            </div>
        `;
        }
    }



    // Function to display the generated quiz questions
    function displayQuiz(receivedQuestions) {
        // Read the selected category from the dropdown
        const selectedCategory = document.getElementById('category').value;
        questions = receivedQuestions; // Store globally

        // If category is "diagram", filter questions to show only those with a diagram field.
        if (selectedCategory.toLowerCase() === 'diagram') {
            questions = questions.filter(q => q.diagram);
        }

        quizContainer.innerHTML = questions.map((q, i) => `
            <div class="question">
                <h3>Question ${i + 1}</h3>
                <p>${q.question}</p>
                ${q.options ? q.options.map((o, idx) => `
                    <div class="option" data-correct="${isCorrectAnswer(o, q.answer)}">
    ${String.fromCharCode(65 + idx)}) ${o.replace(/~~~/g, '')}
</div>
                `).join('') : ''}
                <div class="answer" style="display: none;">Answer: ${formatCodeInAnswer(q.answer)}</div>
                ${q.diagram ? `
                    <div class="diagram" style="display: none;"
                         data-diagram-code="${q.diagram.replace(/"/g, '&quot;')}"></div>
                    <button class="toggle-diagram">Show Diagram</button>
                ` : ''}
                ${q.answer ? '<button class="toggle-answer">Show Answer</button>' : ''}
            </div>
        `).join('');

        // Apply syntax highlighting to any pre/code blocks that might be in the initial view
        Prism.highlightAllUnder(quizContainer);

        // Add event listeners to options (for MCQ questions)
        quizContainer.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', function () {
                const isCorrect = this.dataset.correct === 'true';

                // Clear previous states
                this.parentElement.querySelectorAll('.option').forEach(opt => {
                    opt.classList.remove('correct', 'incorrect', 'dimmed');
                });

                if (isCorrect) {
                    this.classList.add('correct');
                    // Dim other options
                    this.parentElement.querySelectorAll('.option').forEach(opt => {
                        if (opt !== this) opt.classList.add('dimmed');
                    });
                } else {
                    this.classList.add('incorrect');
                    // Highlight correct answer
                    this.parentElement.querySelector('.option[data-correct="true"]')
                        ?.classList.add('correct');
                }
            });
        });
        // Toggle Answer functionality
        quizContainer.querySelectorAll('.toggle-answer').forEach(button => {
            button.addEventListener('click', function () {
                const answerDiv = this.parentElement.querySelector('.answer');
                if (answerDiv.style.display === 'none' || answerDiv.style.display === '') {
                    answerDiv.style.display = 'block';
                    this.textContent = 'Hide Answer';
                    // Apply syntax highlighting when answer becomes visible
                    Prism.highlightAllUnder(answerDiv);
                } else {
                    answerDiv.style.display = 'none';
                    this.textContent = 'Show Answer';
                }
            });
        });
        // Toggle Diagram functionality with improved error handling
        quizContainer.querySelectorAll('.toggle-diagram').forEach(button => {
            // In your diagram toggle event listener:
            button.addEventListener('click', function () {
                const diagramDiv = this.parentElement.querySelector('.diagram');
                if (diagramDiv.style.display === 'none') {
                    diagramDiv.style.display = 'block';
                    this.textContent = 'Hide Diagram';

                    const rawCode = diagramDiv.dataset.diagramCode;
                    const diagramCode = sanitizeMermaidCode(rawCode);

                    renderMermaidDiagram(diagramDiv, diagramCode);
                } else {
                    diagramDiv.style.display = 'none';
                    this.textContent = 'Show Diagram';
                }
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

            // Rebind "toggle-answer" functionality
            quizContainer.querySelectorAll('.toggle-answer').forEach(button => {
                button.addEventListener('click', function () {
                    const answerDiv = this.parentElement.querySelector('.answer');
                    if (answerDiv.style.display === 'none' || answerDiv.style.display === '') {
                        answerDiv.style.display = 'block';
                        this.textContent = 'Hide Answer';
                        // Apply syntax highlighting when answer becomes visible
                        Prism.highlightAllUnder(answerDiv);
                    } else {
                        answerDiv.style.display = 'none';
                        this.textContent = 'Show Answer';
                    }
                });
            });

            // Rebind "toggle-diagram" functionality
            quizContainer.querySelectorAll('.toggle-diagram').forEach(button => {
                button.addEventListener('click', function () {
                    const diagramDiv = this.parentElement.querySelector('.diagram');
                    if (diagramDiv.style.display === 'none' || diagramDiv.style.display === '') {
                        diagramDiv.style.display = 'block';
                        this.textContent = 'Hide Diagram';

                        // Get diagram code and render it
                        const diagramCode = diagramDiv.getAttribute('data-diagram-code');
                        if (diagramCode) {
                            renderMermaidDiagram(diagramDiv, diagramCode);
                        }
                    } else {
                        diagramDiv.style.display = 'none';
                        this.textContent = 'Show Diagram';
                    }
                });
            });
        }
    });

    // Event listener for the Generate Quiz button
    document.getElementById('generate-btn').addEventListener('click', async () => {
        try {
            // First check if we have a JWT
            const jwt = await getStoredJWT();
            if (!jwt) {
                quizContainer.innerHTML = '<div class="error">Please login first</div>';
                return;
            }

            // Display loading animation
            quizContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-text">Generating Quiz</div>
          <div class="loading-spinner">
            <div class="circle"></div>
            <div class="circle"></div>
            <div class="circle"></div>
           <div class="loading-brain"></div>
            <div class="loading-brain"></div>
            <div class="loading-brain"></div>
            <div class="loading-brain"></div>
          </div>
          <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>`;

            // Get current tab and extract content
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found');

            const response = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" });
            if (!response?.content) throw new Error('Failed to extract page content');

            const payload = {
                content: response.content.substring(0, 12000),
                difficulty: document.getElementById('difficulty').value,
                category: document.getElementById('category').value,
                count: document.getElementById('count').value
            };

            console.log('Sending payload:', payload); // Debug log

            // Send message to background script to generate the quiz
            const apiResponse = await fetch('http://localhost:3000/api/generate-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify(payload)
            });

            console.log('API Response status:', apiResponse.status); // Debug log

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || 'API request failed');
            }

            const data = await apiResponse.json();
            console.log('API Response data:', data); // Debug log

            if (!data || data.error) {
                throw new Error(data?.error || 'Invalid response from API');
            }

            // Display the quiz questions
            displayQuiz(data);

        } catch (error) {
            console.error('Generation Error:', error);
            quizContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    });

    // Save button handler
    document.getElementById('save-btn').addEventListener('click', () => {
        const quizData = {
            questions: questions,
            quizHTML: quizContainer.innerHTML
        };
        chrome.storage.local.set({ lastQuiz: quizData });
        const successMessage = document.createElement('div');
        successMessage.className = 'success';
        successMessage.textContent = 'Quiz saved successfully!';
        quizContainer.appendChild(successMessage);
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    });

    // Export JSON functionality
    document.getElementById('export-json').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url, filename: `quiz_${Date.now()}.json` });
    });

    // Copy to clipboard functionality
    document.getElementById('copy-clipboard').addEventListener('click', () => {
        const allText = questions.map((q, i) => {
            let text = `Question ${i + 1}: ${q.question}\n`;
            if (q.options && q.options.length) {
                text += `Options: ${q.options.join(', ')}\n`;
            }
            text += `Answer: ${q.answer}`;
            return text;
        }).join('\n\n');
        navigator.clipboard.writeText(allText);
        const successMessage = document.createElement('div');
        successMessage.className = 'success';
        successMessage.textContent = 'Questions and answers copied to clipboard!';
        quizContainer.appendChild(successMessage);
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    });

    // Clear quiz functionality
    document.getElementById('clear-btn').addEventListener('click', () => {
        quizContainer.innerHTML = '';
        questions = [];
        chrome.storage.local.remove('lastQuiz', () => {
            quizContainer.innerHTML = '<div class="success">Quiz cleared!</div>';
        });
    });

    // Login functionality
    document.getElementById('loginBtn').addEventListener('click', login);

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Initial login status check
    chrome.storage.local.get('jwt', (result) => {
        if (result.jwt) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
        } else {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('main-ui').style.display = 'none';
        }
    });

    function showRatingDialog() {
        const mainUI = document.getElementById('main-ui');
        mainUI.innerHTML = `
            <div class="rating-dialog">
                <h3>Rate your experience</h3>
                <p>How was your Quiz Crawler experience?</p>
                <div class="stars">
                    ${Array(5).fill('&#9733;').map((star, i) =>
                        `<span class="star" data-rating="${i + 1}">${star}</span>`
                    ).join('')}
                </div>
                <div class="rating-buttons">
                    <button id="submit-rating" class="btn" disabled>Submit</button>
                    <button class="btn skip-rating">Skip</button>
                </div>
            </div>
        `;

        // Add star rating functionality
        const stars = mainUI.querySelectorAll('.star');
        const submitBtn = mainUI.querySelector('#submit-rating');
        let selectedRating = 0;

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.rating);
                stars.forEach((s, i) => {
                    s.classList.toggle('active', i < selectedRating);
                });
                submitBtn.disabled = false;
            });

            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.dataset.rating);
                stars.forEach((s, i) => {
                    s.style.color = i < rating ? '#ffd700' : '#ddd';
                });
            });
        });

        // Reset stars on mouse leave
        const starsContainer = mainUI.querySelector('.stars');
        starsContainer.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? '#ffd700' : '#ddd';
            });
        });

        // Handle rating submission
        submitBtn.addEventListener('click', async () => {
            try {
                const jwt = await getStoredJWT();

                // Send rating to backend
                const response = await fetch('http://localhost:3000/api/submit-rating', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`
                    },
                    body: JSON.stringify({ rating: selectedRating })
                });

                if (!response.ok) {
                    throw new Error('Failed to submit rating');
                }

                console.log('Rating submitted:', selectedRating);
                completeLogout(true);
            } catch (error) {
                console.error('Error submitting rating:', error);
                completeLogout(true); // Still logout even if rating submission fails
            }
        });

        // Handle skip
        mainUI.querySelector('.skip-rating').addEventListener('click', () => {
            completeLogout(true);
        });
    }

    function completeLogout(fromRating = false) {
        if (fromRating) {
            chrome.identity.clearAllCachedAuthTokens(() => {
                chrome.storage.local.clear(() => {  // Clear all storage instead of just JWT
                    // Force reload the popup to get a fresh state
                    window.location.reload();
                });
            });
        }
    }

    function showLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        const mainUI = document.getElementById('main-ui');

        // Reset login screen
        loginScreen.innerHTML = `
            <div>
                <h1 class="title">Welcome to Quiz Crawler</h1>
                <p class="subtitle">Sign in to continue to your account</p>
            </div>
            <button id="loginBtn" class="btn btn-login google-btn" aria-label="Sign in with Google">
                <svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span class="btn-text">Sign in with Google</span>
            </button>`;

        // Show login screen and hide main UI
        loginScreen.style.display = 'flex';
        mainUI.style.display = 'none';

        // Remove old event listeners by cloning and replacing the button
        const oldLoginBtn = document.getElementById('loginBtn');
        const newLoginBtn = oldLoginBtn.cloneNode(true);
        oldLoginBtn.parentNode.replaceChild(newLoginBtn, oldLoginBtn);

        // Add new event listener
        newLoginBtn.addEventListener('click', login);
    }

    function login() {
                const loginScreen = document.getElementById('login-screen');

            // Show loading state
        loginScreen.innerHTML = `
            <div class="loading-container">
                <div class="loading-text">Logging in...</div>
                <div class="loading-spinner">
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                 <div class="loading-brain"></div>
            <div class="loading-brain"></div>
            <div class="loading-brain"></div>
            <div class="loading-brain"></div>
          </div>
          <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>`;

        chrome.identity.getAuthToken({ interactive: true }, async function(token) {
            try {
                if (chrome.runtime.lastError) {
                    throw new Error(chrome.runtime.lastError.message);
                }

                console.log('Got token:', token); // Debug log

                const response = await fetch('http://localhost:3000/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
                });

                console.log('Server response status:', response.status); // Debug log

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error');
                }

                const data = await response.json();

                if (!data.token) {
                    throw new Error('No token received from server');
                }

                chrome.storage.local.set({ 'jwt': data.token }, () => {
                    const loginScreen = document.getElementById('login-screen');
                    const mainUI = document.getElementById('main-ui');

                    loginScreen.style.display = 'none';
                        mainUI.style.display = 'block';
                });

            } catch (error) {
                console.error('Login error:', error); // Debug log

                // Reset login screen with error message
                loginScreen.innerHTML = `
                    <div>
                        <h1 class="title">Welcome to Quiz Crawler</h1>
                        <p class="subtitle">Sign in to continue to your account</p>
                    </div>
                    <button id="loginBtn" class="btn btn-login google-btn" aria-label="Sign in with Google">
                        <svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            <path fill="none" d="M0 0h48v48H0z"/>
                        </svg>
                        <span class="btn-text">Sign in with Google</span>
                    </button>
                    <div class="error">Login failed: ${error.message}</div>`;

                // Reattach login event listener
                document.getElementById('loginBtn').addEventListener('click', login);
            }
        });
    }

    async function checkUserRating() {
        try {
            const jwt = await getStoredJWT();
            const response = await fetch('http://localhost:3000/api/check-rating', {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            const data = await response.json();
            return data.hasRating;
        } catch (error) {
            console.error('Error checking rating:', error);
            return false;
        }
    }

    function showGoodbyeMessage() {
        const mainUI = document.getElementById('main-ui');
        mainUI.innerHTML = `
            <div class="rating-dialog">
                <h3>Thanks for using Quiz Crawler!</h3>
                <p>Hope to see you again soon. Have a great day! &#128075;</p>
                <div class="rating-buttons">
                    <button class="btn" id="close-goodbye">Close</button>
                </div>
            </div>
        `;

        // Add event listener to the close button
        document.getElementById('close-goodbye').addEventListener('click', () => {
            completeLogout(true);
        });
    }

    async function logout() {
        // Show loading message first
        const mainUI = document.getElementById('main-ui');
        mainUI.innerHTML = '<div class="loading-container"><div class="loading-text">Logging out...</div></div>';

        // Check if user has already rated
        const hasRating = await checkUserRating();

        setTimeout(() => {
            if (hasRating) {
                showGoodbyeMessage();
            } else {
                showRatingDialog();
            }
        }, 500);
    }

    // Helper to get stored JWT
    function getStoredJWT() {
        return new Promise((resolve) => {
            chrome.storage.local.get('jwt', (result) => {
                resolve(result.jwt);
            });
        });
    }

    // Use this when making API calls
    async function makeAuthenticatedRequest(url, options = {}) {
        const jwt = await getStoredJWT();
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${jwt}`
            }
        });
    }

    // Listen for extension icon clicks
    chrome.action.onClicked.addListener((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
    });

    // Add this to your DOMContentLoaded event listener
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSidebar" });
        });
    });

    // Add this function
    function switchToSidebar() {
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            // First inject our sidebar
            await chrome.tabs.sendMessage(tabs[0].id, { action: "injectSidebar" });
            // Then close the popup
            window.close();
        });
    }

    // Check if we're in sidebar mode
    const urlParams = new URLSearchParams(window.location.search);
    const isSidebar = urlParams.get('sidebar') === 'true';

    if (isSidebar) {
        document.body.classList.add('sidebar-mode');
        // Hide the "Switch to Sidebar" button in sidebar mode
        const switchButton = document.querySelector('.switch-to-sidebar');
        if (switchButton) {
            switchButton.style.display = 'none';
        }
    }

    // Add switch to sidebar button (only in popup mode)
    if (!isSidebar) {
        // Remove or comment out this section
        /*
        const header = document.querySelector('.header .controls');
        const switchButton = document.createElement('button');
        switchButton.className = 'btn switch-to-sidebar';
        switchButton.innerHTML = '&#8689;';
        switchButton.title = 'Switch to Sidebar Mode';
        header.prepend(switchButton);
        */

        switchButton.addEventListener('click', switchToSidebar);
    }
});