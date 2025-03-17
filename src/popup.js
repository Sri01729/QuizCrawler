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
    theme: 'default',
    securityLevel: 'loose',
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true
    }
});

let questions = []; // Global variable to hold quiz data

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
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    maximizeBtn.addEventListener('click', toggleMaximize);


    // Toggle minimize/restore function
    function toggleMinimize() {
        const container = document.getElementById('container');
        if (!container.classList.contains('minimized')) {
            container.dataset.fullHeight = container.style.height || container.offsetHeight + 'px';
            container.classList.add('minimized');
            container.style.height = '60px'; // Set minimized height
        } else {
            container.classList.remove('minimized');
            container.style.height = container.dataset.fullHeight || '500px'; // Restore previous height
        }
    }

    function toggleMaximize() {
        const container = document.getElementById('container');

        // Store original dimensions using computed styles
        if (!container.dataset.originalWidth) {
            const style = getComputedStyle(container);
            container.dataset.originalWidth = style.width;
            container.dataset.originalHeight = style.height;
            container.dataset.originalPosition = style.position;
            container.dataset.originalTop = style.top;
            container.dataset.originalLeft = style.left;
        }

        if (container.classList.contains('maximized')) {
            // Restore original styles from dataset
            container.classList.remove('maximized');
            document.body.classList.remove('body-maximized');

            // Reset to original positioning
            container.style.position = container.dataset.originalPosition;
            container.style.top = container.dataset.originalTop;
            container.style.left = container.dataset.originalLeft;
            container.style.width = container.dataset.originalWidth;
            container.style.height = container.dataset.originalHeight;
        } else {
            // Maximize using CSS class only
            container.classList.add('maximized');
            document.body.classList.add('body-maximized');

            // Clear any conflicting inline styles
            container.style.position = '';
            container.style.top = '';
            container.style.left = '';
            container.style.width = '';
            container.style.height = '';
        }
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
    minimizeBtn.addEventListener('click', toggleMinimize);

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
    function renderMermaidDiagram(container, diagramCode) {
        // Create a unique ID for the diagram
        const uniqueId = 'mermaid-diagram-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        try {
            console.log("Attempting to render diagram with code:", diagramCode);
            // Try to render the diagram
            mermaid.render(uniqueId, diagramCode).then(result => {
                console.log("Render successful:", result);
                container.innerHTML = result.svg;
            }).catch(error => {
                console.error("Mermaid render error:", error);
                container.innerHTML = `<div class="error">Error rendering diagram: ${error.message}</div>`;
            });
        } catch (error) {
            console.error("Error in mermaid rendering process:", error);
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
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
    ${String.fromCharCode(65 + idx)}) ${o.replace(/~~~/g, '')} // Remove code fences
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
            button.addEventListener('click', function () {
                const diagramDiv = this.parentElement.querySelector('.diagram');
                if (diagramDiv.style.display === 'none' || diagramDiv.style.display === '') {
                    diagramDiv.style.display = 'block';
                    diagramDiv.style.minHeight = '200px'; // Ensure there's enough height
                    this.textContent = 'Hide Diagram';

                    // Get diagram code from the data attribute
                    const diagramCode = diagramDiv.getAttribute('data-diagram-code');
                    if (!diagramCode) {
                        console.error('No diagram code found');
                        diagramDiv.innerHTML = '<div class="error">No diagram code found</div>';
                        return;
                    }

                    // Render the diagram
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
        </div>
      `;

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found');

            // Request content extraction from the content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" });
            if (!response?.content) throw new Error('Failed to extract page content');

            // Prepare payload for API call
            const payload = {
                content: response.content.substring(0, 12000),
                difficulty: document.getElementById('difficulty').value,
                category: document.getElementById('category').value,
                count: document.getElementById('count').value
            };

            const timeout = setTimeout(() => {
                quizContainer.innerHTML = '<div class="error">Request timed out (30s)</div>';
            }, 50000);

            // Send message to background script to generate the quiz
            chrome.runtime.sendMessage({ action: "generateQuiz", payload }, (apiResponse) => {
                clearTimeout(timeout);
                try {
                    if (!apiResponse) {
                        throw new Error('Empty response from API');
                    }
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
});