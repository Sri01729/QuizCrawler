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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: `API Error: ${data.error.message}` });
        }

        if (!data.choices?.[0]?.message?.content) {
            return res.status(500).json({ error: 'Empty response from AI model' });
        }

        res.json(JSON.parse(data.choices[0].message.content));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      console.error('No token provided');
      return res.status(400).json({ error: 'No token provided' });
    }

    console.log('Verifying token with Google...');
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const { email, name, picture } = await response.json();
    console.log('Token verified for user:', email);

    // Create or update user in your database
    console.log('Creating/updating user in database...');
    const result = await pool.query(
      'INSERT INTO users (email, name, picture) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET name = $2, picture = $3 RETURNING id',
      [email, name, picture]
    );

    // Generate JWT
    console.log('Generating JWT...');
    const jwt_token = jwt.sign(
      { user_id: result.rows[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Auth successful for user:', email);
    res.json({ token: jwt_token });
  } catch (error) {
    console.error('Auth error:', error);
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