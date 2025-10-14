const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const OpenAI = require('openai');
const Database = require('./database');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Database
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Analytics middleware
app.use((req, res, next) => {
  // Generate or get session ID
  if (!req.sessionId) {
    req.sessionId = req.headers['x-session-id'] || uuidv4();
  }
  
  // Track session
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];
  
  db.createSession(req.sessionId, ipAddress, userAgent).catch(console.error);
  
  // Add session ID to response headers
  res.setHeader('X-Session-ID', req.sessionId);
  next();
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve analytics dashboard
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'analytics.html'));
});

// API endpoint for resume tailoring
app.post('/api/tailor-resume', async (req, res) => {
  const startTime = Date.now();
  let success = false;
  let errorMessage = null;
  
  try {
    const { resume, job } = req.body;

    if (!resume || !job) {
      return res.status(400).json({ 
        error: 'Both resume and job description are required' 
      });
    }

    // Extract keywords from job description
    const keywords = extractKeywords(job);
    const industry = detectIndustry(job);
    const experienceLevel = detectExperienceLevel(job);

    // Track job description
    await db.trackJobDescription(job, keywords.join(','), industry, experienceLevel);
    await db.trackKeywords(keywords.join(','));

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
      success = true;
      
      // Track successful conversion
      await db.trackConversion(req.sessionId, 'tailor');
      
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
        
        success = true;
        await db.trackConversion(req.sessionId, 'tailor');
        res.json({ suggestions: demoResponse });
      } else {
        throw apiError;
      }
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    errorMessage = error.message;
    res.status(500).json({ 
      error: 'Failed to process resume. Please try again.',
      details: error.message 
    });
  } finally {
    // Track the tailoring event
    const processingTime = Date.now() - startTime;
    const { resume, job } = req.body;
    
    if (resume && job) {
      await db.trackTailoringEvent(
        req.sessionId,
        resume.length,
        job.length,
        extractKeywords(job).join(','),
        processingTime,
        success,
        errorMessage
      );
    }
  }
});

// Analytics API endpoints
app.get('/api/analytics/overview', async (req, res) => {
  try {
    const [tailoringStats, topKeywords, popularJobs, conversionFunnel] = await Promise.all([
      db.getTailoringStats(),
      db.getTopKeywords(10),
      db.getPopularJobDescriptions(5),
      db.getConversionFunnel()
    ]);

    res.json({
      tailoringStats,
      topKeywords,
      popularJobs,
      conversionFunnel
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/analytics/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const dailyStats = await db.getDailyStats(days);
    res.json(dailyStats);
  } catch (error) {
    console.error('Daily analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

app.get('/api/analytics/keywords', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const keywords = await db.getTopKeywords(limit);
    res.json(keywords);
  } catch (error) {
    console.error('Keywords analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch keywords data' });
  }
});

app.get('/api/analytics/jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const jobs = await db.getPopularJobDescriptions(limit);
    res.json(jobs);
  } catch (error) {
    console.error('Jobs analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs data' });
  }
});

// Track page views
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { eventType } = req.body;
    await db.trackConversion(req.sessionId, eventType);
    res.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Helper functions for analytics
function extractKeywords(text) {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 20); // Limit to top 20 keywords
}

function detectIndustry(text) {
  const industries = {
    'technology': ['software', 'tech', 'programming', 'developer', 'engineer', 'coding', 'api', 'database', 'cloud', 'ai', 'machine learning'],
    'healthcare': ['medical', 'health', 'patient', 'doctor', 'nurse', 'hospital', 'clinic', 'pharmaceutical'],
    'finance': ['financial', 'banking', 'investment', 'accounting', 'finance', 'trading', 'analyst', 'risk'],
    'education': ['education', 'teaching', 'school', 'university', 'student', 'academic', 'curriculum'],
    'marketing': ['marketing', 'advertising', 'brand', 'campaign', 'social media', 'content', 'seo', 'digital']
  };

  const lowerText = text.toLowerCase();
  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return industry;
    }
  }
  return 'other';
}

function detectExperienceLevel(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('senior') || lowerText.includes('lead') || lowerText.includes('principal') || lowerText.includes('5+ years') || lowerText.includes('10+ years')) {
    return 'senior';
  } else if (lowerText.includes('junior') || lowerText.includes('entry') || lowerText.includes('0-2 years') || lowerText.includes('1-3 years')) {
    return 'junior';
  } else if (lowerText.includes('mid') || lowerText.includes('3-5 years') || lowerText.includes('intermediate')) {
    return 'mid';
  }
  return 'unknown';
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Make sure to set your OPENAI_API_KEY in the .env file');
  console.log('Analytics dashboard available at /analytics');
});
