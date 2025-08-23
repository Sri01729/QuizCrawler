# Quiz Crawler - Chrome Extension

A powerful Chrome extension that automatically generates quizzes from web content using AI. Quiz Crawler extracts content from any webpage and creates customized quizzes with multiple question types, including coding examples, scenario-based questions, conceptual questions, and Mermaid diagrams.

## 🕷️ Features

### Core Functionality
- **Content Extraction**: Automatically extracts and processes content from any webpage
- **AI-Powered Quiz Generation**: Uses OpenAI's GPT models to generate intelligent questions
- **Multiple Question Types**:
  - **General**: Open-ended questions about common practices
  - **Coding Examples**: Code snippets and implementation questions with syntax highlighting
  - **Scenario-Based**: Multiple-choice situational questions
  - **Conceptual**: Theory and principle explanation questions
  - **Mermaid Diagram**: Questions requiring flow/architecture diagrams

### User Experience
- **Google OAuth Integration**: Secure authentication with Google accounts
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Real-time Generation**: Instant quiz creation with progress indicators
- **Export Options**: Download quizzes in various formats
- **Responsive Design**: Works seamlessly across different screen sizes

### Technical Features
- **Content Security**: Secure handling of user data and API keys
- **Database Integration**: PostgreSQL backend for user management and quiz storage
- **Code Syntax Highlighting**: Powered by Prism.js for beautiful code display
- **Diagram Rendering**: Mermaid.js integration for interactive diagrams
- **Webpack Build System**: Modern development workflow with hot reloading

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Google Cloud Console account (for OAuth)
- OpenAI API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd quizscraper
```

### 2. Install Dependencies
```bash
# Install extension dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Database Setup
```bash
# Start PostgreSQL service
# For Mac
brew services start postgresql

# For Ubuntu/Debian
sudo service postgresql start

# Connect as postgres superuser
sudo -u postgres psql

# Create database and user
CREATE USER srinualahari WITH PASSWORD 'your_password';
CREATE DATABASE quiz_generator;
GRANT ALL PRIVILEGES ON DATABASE quiz_generator TO srinualahari;
\c quiz_generator

# Run migrations
\q
cd backend
psql $DATABASE_URL -f migrations.sql
```

### 4. Environment Configuration
Create a `.env` file in the `backend` directory:
```env
DATABASE_URL=postgresql://srinualahari:your_password@localhost:5432/quiz_generator
OPENAI_API_KEY=your_openai_key
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 5. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your client ID to `manifest.json` and backend `.env`

### 6. Build the Extension
```bash
# Build the extension
npm run build

# Or for development with webpack
npm run dev
```

### 7. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory

## 📖 Usage

### Getting Started
1. **Sign In**: Click the extension icon and sign in with your Google account
2. **Navigate**: Go to any webpage with content you want to quiz
3. **Generate**: Click the extension icon and configure your quiz settings:
   - Select question type
   - Choose difficulty level
   - Set number of questions
4. **Review**: Preview generated questions with syntax highlighting and diagrams
5. **Export**: Download your quiz in your preferred format

### Question Types Explained

#### General Questions
- Open-ended questions about common practices
- Suitable for broad topic understanding
- No specific format requirements

#### Coding Examples
- Includes code snippets with syntax highlighting
- Supports multiple programming languages
- Format: `~~~language` syntax for proper highlighting

#### Scenario-Based Questions
- Multiple-choice questions with 4 options
- Situational problem-solving scenarios
- Answer must exactly match one option

#### Conceptual Questions
- Theory and principle explanations
- Comparison and definition questions
- Focus on understanding core concepts

#### Mermaid Diagram Questions
- Visual workflow and architecture questions
- Interactive diagram rendering
- Uses official Mermaid v11.5.0 syntax

## 🏗️ Architecture

### Frontend (Chrome Extension)
```
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content-script.js      # Content extraction logic
├── popup.html            # Main UI interface
├── popup.js              # UI interaction logic
├── popup.css             # Styling and animations
├── lib/                  # Third-party libraries
│   ├── Readability.js    # Content extraction
│   └── mermaid.min.js    # Diagram rendering
└── icons/                # Extension icons
```

### Backend (Node.js/Express)
```
backend/
├── server.js             # Main server file
├── package.json          # Backend dependencies
├── migrations.sql        # Database schema
└── .env                  # Environment variables
```

### Key Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js, PostgreSQL
- **Authentication**: Google OAuth 2.0, JWT
- **AI Integration**: OpenAI GPT API
- **Build Tools**: Webpack, Babel
- **Libraries**: Prism.js, Mermaid.js, Readability.js

## 🔧 Development

### Project Structure
```
quizscraper/
├── src/                  # Source files
├── dist/                 # Built extension
├── backend/              # Node.js server
├── icons/                # Extension icons
├── assets/               # Static assets
├── lib/                  # Third-party libraries
├── package.json          # Extension dependencies
├── webpack.config.js     # Build configuration
├── manifest.json         # Extension manifest
└── README.md            # This file
```

### Development Commands
```bash
# Install dependencies
npm install

# Build extension
npm run build

# Development mode with webpack
npm run dev

# Start backend server
cd backend
npm run dev

# Run database migrations
npm run migrate
```

### Code Style
- Use ES6+ JavaScript features
- Follow Chrome Extension Manifest V3 guidelines
- Implement proper error handling
- Use async/await for API calls
- Follow RESTful API design principles

## 🔒 Security

### Data Protection
- All API keys stored securely in environment variables
- User authentication via Google OAuth 2.0
- JWT tokens for session management
- HTTPS-only API communication
- Content Security Policy (CSP) implementation

### Privacy
- Minimal data collection (email, name, profile picture)
- No content storage without user consent
- Secure database connections
- Regular security audits recommended

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
- Check Chrome extension permissions
- Verify manifest.json syntax
- Ensure all files are in correct locations

#### Authentication Issues
- Verify Google OAuth credentials
- Check backend server is running
- Ensure correct client ID in manifest.json

#### Database Connection
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure user permissions are correct

#### API Errors
- Verify OpenAI API key is valid
- Check API rate limits
- Ensure proper error handling

### Debug Mode
Enable debug logging by setting `DEBUG=true` in your environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Test on multiple Chrome versions

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for AI capabilities
- [Mozilla Readability](https://github.com/mozilla/readability) for content extraction
- [Mermaid.js](https://mermaid.js.org/) for diagram rendering
- [Prism.js](https://prismjs.com/) for syntax highlighting
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2) for authentication

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the [WORKFLOW.md](WORKFLOW.md) for detailed setup instructions
- Review the troubleshooting section above

---

**Note**: This extension requires an active internet connection and valid API keys to function properly. Make sure to keep your API keys secure and never commit them to version control.