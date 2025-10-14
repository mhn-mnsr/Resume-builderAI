const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint for resume tailoring
app.post('/api/tailor-resume', async (req, res) => {
  try {
    const { resume, job } = req.body;

    if (!resume || !job) {
      return res.status(400).json({ 
        error: 'Both resume and job description are required' 
      });
    }

    // Check if API key has quota
    const prompt = `Take this resume:\n${resume}\n\nAnd this job description:\n${job}\n\nSuggest personalized edits and tailored resume bullets.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful resume editor." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      res.json({ suggestions: response });

    } catch (apiError) {
      // If API quota exceeded, provide demo suggestions
      if (apiError.status === 429) {
        const demoResponse = `🎯 **Resume Tailoring Suggestions** (Demo Mode)

**Key Skills to Highlight:**
• Emphasize React and JavaScript experience prominently
• Add specific project examples with measurable results
• Include any relevant certifications or courses

**Action Verbs to Use:**
• Developed, Implemented, Optimized, Collaborated
• Led, Managed, Designed, Delivered

**Tailored Bullet Points:**
• "Developed responsive React applications serving 1000+ users"
• "Collaborated with cross-functional teams to deliver frontend solutions"
• "Optimized JavaScript performance resulting in 30% faster load times"

**Keywords to Include:**
• Frontend Development, React.js, JavaScript, User Interface
• Responsive Design, Component Architecture, State Management

**Next Steps:**
• Add specific metrics and quantifiable achievements
• Include relevant technologies mentioned in the job description
• Customize your summary to match the role requirements

💡 **Note:** This is a demo response. To get AI-powered suggestions, please add credits to your OpenAI account.`;
        
        res.json({ suggestions: demoResponse });
      } else {
        throw apiError;
      }
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ 
      error: 'Failed to process resume. Please try again.',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Make sure to set your OPENAI_API_KEY in the .env file');
});
