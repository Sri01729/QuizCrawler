# Authentication and Database Setup Workflow

## 1. Google OAuth Setup
1. Install Google OAuth library:
```bash
npm install google-auth-library
```

2. Add OAuth configuration to manifest.json:
```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}
```

## 2. PostgreSQL Database Setup
1. Install PostgreSQL:
```bash
# For Mac
brew install postgresql@14

# For Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
```

2. Start PostgreSQL service:
```bash
# For Mac
brew services start postgresql

# For Ubuntu/Debian
sudo service postgresql start
```

3. Connect as postgres superuser:
```bash
sudo -u postgres psql
```

4. Create Database and User:
```sql
CREATE USER srinualahari WITH PASSWORD 'your_password';
CREATE DATABASE quiz_generator;
GRANT ALL PRIVILEGES ON DATABASE quiz_generator TO srinualahari;
```

5. Connect to the quiz_generator database:
```sql
\c quiz_generator
```

6. Create Users Table:
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

7. Grant Table Permissions:
```sql
GRANT ALL PRIVILEGES ON TABLE users TO srinualahari;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO srinualahari;
```

## 3. Backend Setup (.env configuration)
Create a .env file in the backend directory:
```env
DATABASE_URL=postgresql://srinualahari:your_password@localhost:5432/quiz_generator
OPENAI_API_KEY=your_openai_key
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## 4. Backend Implementation
1. Install required packages:
```bash
npm install express cors pg bcrypt jsonwebtoken google-auth-library
```

2. Implement Google OAuth endpoint in server.js:
```javascript
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    // Get user info using access token
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { email, name, picture } = await response.json();

    // Create/update user in database
    const result = await pool.query(
      'INSERT INTO users (email, name, picture) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = $2, picture = $3
       RETURNING id',
      [email, name, picture]
    );

    // Generate JWT
    const jwt_token = jwt.sign(
      { user_id: result.rows[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token: jwt_token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 5. Frontend Implementation
1. Add login/logout buttons to popup.html:
```html
<button id="loginBtn">Login with Google</button>
<button id="logoutBtn">Logout</button>
```

2. Implement login/logout functions in popup.js:
```javascript
function login() {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      console.error('Chrome identity error:', chrome.runtime.lastError);
      return;
    }

    fetch('http://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
      chrome.storage.local.set({ 'jwt': data.token }, () => {
        updateLoginStatus();
        quizContainer.innerHTML = '<div class="success">Login successful!</div>';
      });
    });
  });
}

function logout() {
  const mainUI = document.getElementById('main-ui');
  mainUI.innerHTML = '<div class="loading-container"><div class="loading-text">Logging out...</div></div>';
  chrome.identity.clearAllCachedAuthTokens(() => {
    chrome.storage.local.remove('jwt', () => {
      updateLoginStatus();
      const quizContainer = document.getElementById('quiz-container');
      quizContainer.innerHTML = '<div class="success">Logged out successfully!</div>';
    });
  });
}
```

## 6. Testing the Setup
1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Load the extension in Chrome:
   - Go to chrome://extensions/
   - Enable Developer mode
   - Click "Load unpacked"
   - Select your extension directory

3. Test the authentication flow:
   - Click the extension icon
   - Click "Login with Google"
   - Select your Google account
   - Verify successful login message
   - Test logout functionality

## 7. Troubleshooting
Common issues and solutions:
- Database permission errors: Run GRANT commands
- "Wrong number of segments in token": Verify token handling in backend
- Connection refused: Check if database and backend server are running
- Auth errors: Verify Google OAuth credentials and environment variables

## 8. Security Considerations
- Store sensitive keys in .env file
- Use HTTPS in production
- Implement proper CORS settings
- Regular JWT token rotation
- Secure database connection
- Input validation and sanitization

## Recent Authentication Flow Issues and Solutions

### Problem 1: Login/Logout Message Issues
- **Issue**: When clicking logout, no loading message was shown
- **Solution**: Added loading message with animation during logout process
```javascript
function logout() {
    const mainUI = document.getElementById('main-ui');
    mainUI.innerHTML = '<div class="loading-container"><div class="loading-text">Logging out...</div></div>';
    // ... rest of logout logic
}
```

### Problem 2: Login/Logout State Loop
- **Issue**: After logging out and trying to log in again, the app got stuck in a loop between login and rating screens
- **Initial Attempts**:
  - Adding state management flags (didn't work)
  - Cleaning up event listeners (didn't work)
  - Restructuring the auth flow (didn't work)
- **Working Solution**: Force complete state reset after logout
```javascript
function completeLogout(fromRating = false) {
    if (fromRating) {
        chrome.identity.clearAllCachedAuthTokens(() => {
            chrome.storage.local.clear(() => {
                window.location.reload(); // Force complete refresh
            });
        });
    }
}
```

### Problem 3: Rating Dialog Implementation
- **Feature**: Added user feedback collection before logout
- **Implementation**:
  1. Show loading message
  2. Display rating dialog with 5 stars
  3. Allow skip option
  4. Complete logout after rating/skip
  5. Force state reset for clean login screen