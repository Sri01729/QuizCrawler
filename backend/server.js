require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/generate-quiz', authenticateToken, async (req, res) => {
    try {
        const { content, difficulty, category, count } = req.body;

        console.log('Received quiz generation request:', {
            difficulty,
            category,
            count,
            contentLength: content?.length
        });

        if (!content) {
            throw new Error('No content provided');
        }

        const prompt = `Generate ${count} ${difficulty} level questions in the "${category}" category based on: ${content}

For each question, follow these category-specific requirements:
- "General": Open-ended questions about common practices
- "Programming": Include code snippets/implementation questions
- "Scenario-Based": Situational questions with multiple-choice options
- "Conceptual": Theory/principle explanation questions
- "Mermaid Diagram": Questions requiring flow/architecture diagrams
- "Interview": Interview questions

personalities regarding category:
- 'general':
<smithery:sequential-thinking>
<task>
Create quiz questions about the provided content with structured reasoning.
</task>

<step name="understand-content">
Analyze the full provided content thoroughly.
What are the main topics, concepts, and key points in this content?
What knowledge domains does this content cover?
</step>

<step name="identify-key-areas">
Based on the analysis, identify ${count} distinct areas that would make good quiz questions.
For each area, note why it's important and what testing it would reveal about someone's understanding.
</step>

<step name="craft-questions">
For each identified area, craft a clear, concise question of ${difficulty} difficulty.
Ensure each question has a single, unambiguous correct answer.
Make questions challenging but fair, avoiding trick questions.
</step>

<step name="develop-answers">
For each question, develop a comprehensive answer that explains the concept fully.
Include relevant context, definitions, and examples where appropriate.
Ensure answers are accurate and align precisely with the questions.
</step>

</smithery:sequential-thinking>

- 'programming':
<smithery:sequential-thinking>
<task>
Convert ${content} into programming-style questions/snippets that abstractly model its core ideas as code logic, regardless of domain.
</task>

<step name="analyze-universal-concepts">
1. Thoroughly analyze ${content} to identify:
   - Key processes, formulas, or relationships (e.g., "supply/demand curves" for economics, "neural signal pathways" for anatomy).
   - Sequences, hierarchies, or cause-effect chains (e.g., historical events, biological cycles).
2. Flag abstract patterns that can be represented as functions, algorithms, or simulations.
</step>

<step name="map-to-code-structures">
For ${count} identified concepts:
- Translate workflows into:
   • Functions (e.g., calculate_[metric], simulate_[process])
   • Conditional logic (if/else for decision-based systems)
   • Loops/iterations (for recurring patterns)
   • Data structures (e.g., arrays for timelines, objects for entity properties)
- Use domain-specific terms in variable/function names (e.g., platelet_count, inflation_rate).
- Set ${difficulty}:
   • Basic: Formula/equation translation
   • Advanced: Multi-step simulations with error handling
</step>

<step name="craft-questions">
Create questions with:
1. Code snippets using [bracketed placeholders] for domain terms (e.g., "Write a function to calculate [metric] using [formula]").
2. Instructions to complete/debug/explain the code.
3. Plain text code formatting (no markdown).

Examples:
Question (Anatomy):
def simulate_blood_flow(heart_rate, blood_pressure):
    oxygen = (heart_rate * blood_pressure) / [constant]  # Replace [constant]
    return oxygen

Question (Stocks):
function predictTrend(historicalData) {
  let movingAverage = historicalData.reduce((a, b) => a + b) / [length];
  return movingAverage > currentPrice ? "Bullish" : "Bearish";
}
</step>

<step name="develop-answers">
For each answer:
1. Explicitly connect code logic to the domain (e.g., "This loop models the stages of [biological process]").
2. Replace placeholders with actual terms from ${content} (e.g., [metric] → "GDP growth rate").
3. For advanced: Add edge-case handling (e.g., "Validate that [parameter] cannot be negative").

Examples:
Answer (Anatomy):
def simulate_blood_flow(heart_rate, blood_pressure):
    oxygen = (heart_rate * blood_pressure) / 20  # Systemic vascular resistance ≈20
    return oxygen

Answer (Stocks):
function predictTrend(historicalData) {
  let movingAverage = historicalData.reduce((a, b) => a + b) / 30; // 30-day average
  return movingAverage > currentPrice ? "Bullish" : "Bearish";
}
</step>
</smithery:sequential-thinking>

- 'scenario-based':
<smithery:sequential-thinking>
<task>
Create scenario-based quiz questions that test application of knowledge from the content.
</task>

<step name="extract-practical-scenarios">
Analyze the full provided content thoroughly.
What real-world scenarios or case studies are mentioned or implied?
What principles or concepts could be applied in practical situations?
</step>

<step name="design-scenarios">
Design ${count} distinct scenarios of ${difficulty} difficulty that require applying knowledge from the content.
Each scenario should be realistic, specific, and require critical thinking.
Ensure scenarios are diverse and cover different aspects of the content.
</step>

<step name="formulate-scenario-questions">
For each scenario, craft a question that asks how to analyze, solve, or respond to the situation.
Make questions clear but complex enough to require thoughtful application of knowledge.
Ensure the questions are practical rather than purely theoretical.
</step>

<step name="develop-scenario-answers">
Create comprehensive answers that walk through the proper approach to each scenario.
Include rationale for decisions, alternative approaches, and potential outcomes.
Connect the answers back to principles from the original content.
</step>


Verify all scenario questions and answers are practical and applicable.
</smithery:sequential-thinking>

- 'conceptual':
<smithery:sequential-thinking>
<task>
Create conceptual quiz questions that test deep understanding of the content's theoretical foundations.
</task>

<step name="identify-core-concepts">
Analyze the full provided content thoroughly.
What are the fundamental concepts, theories, or mental models presented?
What are the relationships between these concepts?
</step>

<step name="formulate-concept-areas">
Identify ${count} distinct conceptual areas of ${difficulty} difficulty to explore through questions.
For each area, determine what aspect of conceptual understanding to test (definition, application, analysis, comparison, etc.)
Ensure conceptual areas are foundational and not just surface-level facts.
</step>

<step name="craft-conceptual-questions">
For each area, craft a question that requires deep understanding of the concept.
Questions should test comprehension beyond mere recall of information.
Consider questions that explore relationships between concepts or theoretical implications.
</step>

<step name="develop-conceptual-answers">
Create comprehensive answers that thoroughly explain each concept.
Include definitions, theoretical frameworks, historical context if relevant, and practical implications.
Where appropriate, address common misconceptions or alternative theoretical perspectives.
</step>


Ensure all questions truly test conceptual understanding rather than factual recall.

</smithery:sequential-thinking>


- 'mermaid-diagram':
<smithery:sequential-thinking>
<task>
For the provided ${content}, create **one quiz question per diagram type** from the predefined list below. Each question must use a distinct diagram type, even if abstractly applied.
</task>

<step name="map-all-diagram-types">
1. Mandatory diagram types to cover (one question each):
   - Flowchart, Sequence, Class, State, Entity Relationship, User Journey, Gantt, Pie Chart, Quadrant Chart, Requirement, Gitgraph, C4, Mindmaps, Timeline, ZenUML, Sankey, XY Chart, Block, Packet, Kanban, Architecture
2. For each diagram type:
   - Force a relevant application to ${content}, even if abstract.
   - Example: Use a "Gitgraph" for historical content by treating events as commits.
</step>

<step name="design-per-type-concepts">
For each diagram type:
1. Identify how to model ${content} using the diagram’s structure:
   - Flowchart → Break into steps/decisions.
   - Class → Hierarchical taxonomy.
   - Sankey → Resource flow.
   - ... (apply to all types).
2. Set complexity to ${difficulty}:
   - Basic: 3-4 nodes/relationships.
   - Advanced: Multi-layered logic.
</step>

<step name="create-all-diagrams">
For each diagram type:
1. Write valid Mermaid syntax.
2. Include placeholders if needed (e.g., "Add [node] for [concept]").
3. Example (Gitgraph for historical content):
gitGraph
    commit id: "1776" tag: "Declaration of Independence"
    commit id: "1787" tag: "Constitution Ratified"
    branch slavery_debate
    commit id: "1861" tag: "Civil War Begins"
</step>

<step name="craft-per-type-questions">
For each diagram type:
1. Ask to interpret, complete, or correct the diagram.
2. Examples:
   - Flowchart: "Add a decision node for [medical diagnosis step]."
   - Sankey: "Identify where 20% of [resource] is wasted."
   - Class: "Extend this taxonomy with a [subclass]."
</step>

<step name="develop-per-type-answers">
For each diagram type:
1. Provide the corrected/completed diagram.
2. Explain how the diagram type suits the content:
   - "The XY Chart plots [variable A] vs [variable B] from the content."
   - "The Kanban diagram stages align with [process phases]."
</step>
</smithery:sequential-thinking>  

- 'interview':
<smithery:sequential-thinking>
<task>
Create interview questions based on the provided content that assess candidates effectively.
</task>

<step name="analyze-interview-content">
Analyze the full provided content thoroughly.
What skills, knowledge areas, and competencies are most relevant for interviews?
What types of roles or positions would require this knowledge?
</step>

<step name="design-interview-question-types">
Plan ${count} diverse interview questions of ${difficulty} difficulty covering:
- Technical knowledge questions that test understanding of core concepts
- Behavioral questions that assess past experiences with these concepts
- Situational questions that test application in hypothetical scenarios
- Problem-solving questions that assess analytical abilities
</step>

<step name="craft-interview-questions">
For each question type, craft a clear, professional interview question.
Ensure questions are open-ended enough to allow candidates to demonstrate depth of knowledge.
Make questions challenging but fair for the ${difficulty} level.
</step>

<step name="develop-evaluation-criteria">
For each question, develop criteria for what constitutes a strong answer.
Include key points, examples, and reasoning that an ideal candidate would demonstrate.
Note what would distinguish exceptional answers from merely adequate ones.
</step>

<step name="create-model-answers">
Create comprehensive model answers that would meet all evaluation criteria.
Include what interviewers should listen for and potential follow-up questions.
Structure answers to show progression from basic to sophisticated understanding.
</step>


Ensure questions and answers are professional and appropriate for real interviews.
</smithery:sequential-thinking>



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
For Scenario-Based questions use EXACTLY this format:
{
  "type": "scenario-based",
  "question": "Which method is best for...",
  "options": [
    "Option 1 text",  // No markdown
    "Option 2 text",
    "Option 3 text",
    "Option 4 text"
  ],
  "answer": "Exact matching option text" // Must match one option exactly
  "diagram": null
}

Key requirements:
- Answer must be identical to one option text
- No markdown in options/answers
- No explanations in answers for MCQs

2. Mermaid Diagram:
{
  "type": "mermaid-diagram",
  "question": "Visualize the workflow for...",
  "answer": "System description",
  "diagram": "graph TD\\n  A-->B"
}

For Mermaid Diagrams STRICTLY REQUIRE:
- Use ONLY official syntax from Mermaid v11.5.0
- Wrap ALL node labels in double quotes: ["Label"]
- Allow special characters (){} INSIDE quoted labels
- Use explicit arrow syntax: --> with no spaces
- Maintain proper indentation (4 spaces per level)
- Ensure all paths are fully connected
- Follow this exact structure:
graph TD
    A["Start"] --> B["Process(input)"]
    B --> C{"Decision?"}
    C -->|Yes| D["Success"]
    C -->|No| E["Retry"]

STRICTLY PROHIBITED:
- Unquoted labels with special characters: [Process()]
- Spaced arrows: -- > instead of -->
- Incomplete paths
- HTML entities like &amp; or &#40;
- Hanging connections
- These patterns:
graph TD
    A[Start]-- > B[Process]  # Bad spacing
    X[Unclosed label --> Y

Ensure valid JSON syntax and proper escaping. Generate exactly ${count} items.`;

        console.log('Sending request to OpenAI...'); // Debug log

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",  // Make sure you're using the correct model
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7
            })
        });

        console.log('OpenAI response status:', response.status); // Debug log

        const data = await response.json();
        console.log('OpenAI response:', data); // Debug log

        if (data.error) {
            return res.status(500).json({ error: `API Error: ${data.error.message}` });
        }

        if (!data.choices?.[0]?.message?.content) {
            return res.status(500).json({ error: 'Empty response from AI model' });
        }

        // Clean the response before parsing
        const cleanedResponse = data.choices[0].message.content.replace(/```json\s*|\s*```/g, '').trim();

        try {
            const parsedQuestions = JSON.parse(cleanedResponse);
            res.json(parsedQuestions);
        } catch (parseError) {
            res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    console.log('Received token request:', token ? 'Token present' : 'No token'); // Debug log

    if (!token) {
      console.error('No token provided');
      return res.status(400).json({ error: 'No token provided' });
    }

    console.log('Verifying token with Google...'); // Debug log
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error('Google API error:', response.status); // Debug log
      throw new Error('Failed to get user info from Google');
    }

    const { email, name, picture } = await response.json();
    console.log('User info received:', { email, name }); // Debug log

    // Create or update user in database
    console.log('Updating database...'); // Debug log
    const result = await pool.query(
      'INSERT INTO users (email, name, picture) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET name = $2, picture = $3 RETURNING id',
      [email, name, picture]
    );

    // Generate JWT
    console.log('Generating JWT...'); // Debug log
    const jwt_token = jwt.sign(
      { user_id: result.rows[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Auth successful for user:', email); // Debug log
    res.json({ token: jwt_token });
  } catch (error) {
    console.error('Auth error:', error); // Debug log
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add a new logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      console.log('Logout attempt with no token');
      return res.status(200).json({ message: 'Already logged out' });
    }

    // Verify the token to get user info for logging
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('Invalid token during logout');
      } else {
        console.log('User logged out successfully:', decoded.email);
      }
    });

    console.log('Logout successful');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rating submission endpoint
app.post('/api/submit-rating', authenticateToken, async (req, res) => {
    try {
        const { rating } = req.body;
        const userId = req.user.user_id;

        // Update the users table with the rating
        await pool.query(
            'UPDATE users SET rating = $1 WHERE id = $2',
            [rating, userId]
        );

        res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
        console.error('Error saving rating:', error);
        res.status(500).json({ error: 'Failed to save rating' });
    }
});

// Add this new endpoint to check if user has already rated
app.get('/api/check-rating', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const result = await pool.query(
            'SELECT rating FROM users WHERE id = $1',
            [userId]
        );

        const hasRating = result.rows[0]?.rating != null;
        res.json({ hasRating });
    } catch (error) {
        console.error('Error checking rating:', error);
        res.status(500).json({ error: 'Failed to check rating status' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});