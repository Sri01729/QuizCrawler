const OPENAI_API_KEY = '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'; // Replace with your key

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateQuiz") {
        const { content, difficulty, category, count } = request.payload;
        const prompt = `Generate ${count} ${difficulty} level ${category} questions with answers based on:
${content}
Format response as valid JSON array with objects containing:
{
  "question": "...",
  "options": ["...", "..."],  // optional for open-ended questions
  "answer": "..."
}`;

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
