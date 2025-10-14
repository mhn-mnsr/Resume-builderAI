# 🎯 Smart Resume Tailor

A secure, AI-powered resume tailoring application that helps you customize your resume for specific job applications.

## ✨ Features

- **AI-Powered Suggestions**: Get personalized resume recommendations using OpenAI's GPT models
- **Secure Backend**: API keys are protected server-side, never exposed to the client
- **Demo Mode**: Provides helpful suggestions even when API quota is exceeded
- **Professional UI**: Clean, responsive design that works on all devices
- **Error Handling**: Graceful fallback and user-friendly error messages

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/resume-builder.git
   cd resume-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file in the root directory
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
   echo "PORT=3000" >> .env
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Usage

1. **Paste your resume** in the first textarea
2. **Paste the job description** in the second textarea
3. **Click "Tailor My Resume"** to get AI-powered suggestions
4. **Review the suggestions** and apply them to your resume

## 🛡️ Security Features

- **Server-side API calls**: OpenAI API key is never exposed to the client
- **Environment variables**: Sensitive data is properly managed
- **Error handling**: Graceful fallback when API quota is exceeded
- **Input validation**: Proper validation of user inputs

## 📁 Project Structure

```
resume-builder/
├── index.html          # Frontend interface
├── script.js           # Client-side JavaScript
├── style.css           # Styling and responsive design
├── server.js           # Express.js backend server
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (create this)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🔑 API Configuration

### Getting an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Create a new secret key
5. Add credits to your account for API usage

### Setting Up Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

## 🎨 Demo Mode

When your OpenAI API quota is exceeded, the application automatically switches to demo mode, providing:

- **Key Skills to Highlight**: Relevant skills based on the job description
- **Action Verbs**: Powerful verbs to strengthen your bullet points
- **Tailored Bullet Points**: Example bullet points with metrics
- **Keywords**: Important keywords to include
- **Next Steps**: Actionable advice for improvement

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production Deployment
1. Set up your production environment variables
2. Use a process manager like PM2
3. Set up a reverse proxy with Nginx
4. Configure SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- Express.js for the backend framework
- The open-source community for inspiration and tools

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/resume-builder/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

---

**Happy Resume Tailoring! 🎯**
