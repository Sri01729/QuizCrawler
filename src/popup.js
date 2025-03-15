import process from 'process/browser';
import mermaid from 'mermaid';

window.process = process;

let questions = []; // Global variable to hold quiz data

document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.getElementById('quiz-container');
    const toggleConfigBtn = document.getElementById('toggle-config');
    const configWrapper = document.querySelector('.config-wrapper');
    const refreshBtn = document.getElementById('refresh-btn');
    const minimizeBtn = document.getElementById('minimize-btn');

    // Toggle minimize/restore function (assumes a container element with id 'container')
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
        ${q.type === "scenario" ? `
          <div class="scenario-answer" style="display: none;">Answer: ${q.answer}</div>
          <div class="scenario-feedback" style="display: none;"></div>
        ` : q.options ? q.options.map((o, idx) => `
          <div class="option" data-correct="${o === q.answer}">${String.fromCharCode(65 + idx)}) ${o}</div>
        `).join('') : ''}
        <div class="answer" style="display: none;">Answer: ${q.answer}</div>
        ${q.diagram ? `
  <div class="diagram" style="display: none;" data-mermaid-code="${q.diagram.replace(/"/g, '&quot;')}"></div>
  <button class="toggle-diagram">Show Diagram</button>
` : ''}

        ${q.answer ? '<button class="toggle-answer">Show Answer</button>' : ''}
      </div>
    `).join('');

        // Add event listeners to options (for MCQ questions)
        quizContainer.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', function () {
                const isCorrect = this.getAttribute('data-correct') === 'true';
                if (isCorrect) {
                    this.classList.add('correct');
                } else {
                    this.classList.add('incorrect');
                }
                setTimeout(() => {
                    this.classList.remove('correct', 'incorrect');
                }, 2000);
            });
        });

        // Toggle Answer functionality
        quizContainer.querySelectorAll('.toggle-answer').forEach(button => {
            button.addEventListener('click', function () {
                const answerDiv = this.parentElement.querySelector('.answer');
                if (answerDiv.style.display === 'none' || answerDiv.style.display === '') {
                    answerDiv.style.display = 'block';
                    this.textContent = 'Hide Answer';
                } else {
                    answerDiv.style.display = 'none';
                    this.textContent = 'Show Answer';
                }
            });
        });

        // Toggle Diagram functionality using mermaid.render()
        // Toggle Diagram functionality using mermaid.render()
        quizContainer.querySelectorAll('.toggle-diagram').forEach(button => {
            button.addEventListener('click', function () {
                const diagramDiv = this.parentElement.querySelector('.diagram');
                if (diagramDiv.style.display === 'none' || diagramDiv.style.display === '') {
                    diagramDiv.style.display = 'block';
                    diagramDiv.style.minHeight = '100px'; // Ensure there's some height
                    diagramDiv.style.border = '1px solid red'; // For debugging (remove later)
                    this.textContent = 'Hide Diagram';
                    if (typeof mermaid !== 'undefined') {
                        const rawCode = diagramDiv.getAttribute('data-mermaid-code');
                        if (!rawCode) {
                            console.error('No Mermaid code found.');
                            return;
                        }
                        const uniqueId = 'mermaid-svg-' + Date.now();
                        mermaid.render(uniqueId, rawCode, (svgCode) => {
                            console.log("Rendered SVG:", svgCode);
                            diagramDiv.innerHTML = svgCode;
                        });
                    }
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
                    } else {
                        answerDiv.style.display = 'none';
                        this.textContent = 'Show Answer';
                    }
                });
            });
            // Rebind "toggle-diagram" functionality if applicable
            quizContainer.querySelectorAll('.toggle-diagram').forEach(button => {
                button.addEventListener('click', function () {
                    const diagramDiv = this.parentElement.querySelector('.diagram');
                    if (diagramDiv.style.display === 'none' || diagramDiv.style.display === '') {
                        diagramDiv.style.display = 'block';
                        this.textContent = 'Hide Diagram';
                        if (typeof mermaid !== 'undefined') {
                            const diagramCode = diagramDiv.textContent;
                            const uniqueId = 'mermaid-svg-' + Date.now();
                            mermaid.render(uniqueId, diagramCode, (svgCode) => {
                                diagramDiv.innerHTML = svgCode;
                            });
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
            }, 30000);

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
