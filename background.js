const OPENAI_API_KEY = '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'; // Replace with your key

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateQuiz") {
        const { content, difficulty, category, count } = request.payload;
        const prompt = `Generate ${count} ${difficulty} level questions in the "${category}" category based on: ${content}

For each question, follow these category-specific requirements:
- "General": Open-ended questions about common practices
- "Coding Examples": Include code snippets/implementation questions
- "Scenario-Based": Situational questions with multiple-choice options
- "Conceptual": Theory/principle explanation questions
- "Mermaid Diagram": Questions requiring flow/architecture diagrams

Format response as valid JSON array containing objects with:
{
  "type": "${category.toLowerCase().replace(' ', '-')}",  // Auto-generated from category
  "question": "Category-appropriate question text",
  "options": ["..."] // Required for Scenario-Based, optional otherwise,
  "answer": "Detailed solution",
  "diagram": "mermaid syntax" // Only for Mermaid Diagram category
}

Include these category-specific elements:
- Coding Examples Rules:
1. For code examples: Use "~~~language" syntax to indicate code blocks like "~~~javascript" or "~~~python"
2. Always specify the language after the ~~~ for proper syntax highlighting
3. Format code answer as:
{
  "type": "coding-examples",
  "question": "Write Python code to read a file",
  "answer": "To read a file in Python:\\n\\n~~~python\\nwith open('file.txt') as f:\\n    print(f.read())\\n~~~\\n\\nThis code opens the file and reads its content.",
  "diagram": null
}

- Scenario-Based: 4 plausible options per question
- Conceptual: Ask for comparisons/definitions
- Mermaid Diagram: Include complete diagram in answer

Example structures:
1. Scenario-Based:
{
  "type": "scenario-based",
  "question": "In a distributed system, when would you...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Correct option with justification"
}

2. Mermaid Diagram:
{
  "type": "mermaid-diagram",
  "question": "Visualize the workflow for...",
  "answer": "System description",
  "diagram": "graph TD\\n  A-->B"
}

Ensure valid JSON syntax and proper escaping. Generate exactly ${count} items.`;

        console.log('API Request:', prompt);

        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    sendResponse(JSON.stringify({ error: `API Error: ${data.error.message}` }));
                    return;
                }
                if (!data.choices?.[0]?.message?.content) {
                    sendResponse(JSON.stringify({ error: 'Empty response from AI model' }));
                    return;
                }
                console.log('API Response:', data);
                sendResponse(data.choices[0].message.content);
            })
            .catch(error => sendResponse(JSON.stringify({ error: error.message })));

        return true; // Keep the message channel open for asynchronous response
    }
});
