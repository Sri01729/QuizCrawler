const OPENAI_API_KEY = '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'; // Replace with your key

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateQuiz") {
        const { content, difficulty, category, count } = request.payload;
        const prompt = `Generate ${count} ${difficulty} level ${category} questions with answers based on:
${content}
Format response as valid JSON array with objects containing:
{
  "question": "...",
  "options": ["...", "..."],  
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
