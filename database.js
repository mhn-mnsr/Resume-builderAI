const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'analytics.db'));
    this.init();
  }

  init() {
    // Create tables for analytics
    this.db.serialize(() => {
      // User sessions table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Resume tailoring events
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tailoring_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          resume_length INTEGER,
          job_description_length INTEGER,
          job_keywords TEXT,
          processing_time_ms INTEGER,
          success BOOLEAN,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES user_sessions (session_id)
        )
      `);

      // Job description analysis
      this.db.run(`
        CREATE TABLE IF NOT EXISTS job_descriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_hash TEXT UNIQUE,
          content TEXT,
          keywords TEXT,
          industry TEXT,
          experience_level TEXT,
          usage_count INTEGER DEFAULT 1,
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Common keywords tracking
      this.db.run(`
        CREATE TABLE IF NOT EXISTS keyword_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          keyword TEXT,
          frequency INTEGER DEFAULT 1,
          last_used DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Conversion tracking
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          event_type TEXT, -- 'view', 'tailor', 'download', 'share'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES user_sessions (session_id)
        )
      `);
    });
  }

  // Session management
  createSession(sessionId, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO user_sessions (session_id, ip_address, user_agent, last_activity) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [sessionId, ipAddress, userAgent],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Track tailoring events
  trackTailoringEvent(sessionId, resumeLength, jobLength, keywords, processingTime, success, errorMessage) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO tailoring_events (session_id, resume_length, job_description_length, job_keywords, processing_time_ms, success, error_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, resumeLength, jobLength, keywords, processingTime, success, errorMessage],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Track job descriptions
  trackJobDescription(content, keywords, industry, experienceLevel) {
    const contentHash = require('crypto').createHash('md5').update(content).digest('hex');
    
    return new Promise((resolve, reject) => {
      // Check if job description already exists
      this.db.get(
        'SELECT id, usage_count FROM job_descriptions WHERE content_hash = ?',
        [contentHash],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Update existing record
            this.db.run(
              'UPDATE job_descriptions SET usage_count = usage_count + 1, last_seen = CURRENT_TIMESTAMP WHERE content_hash = ?',
              [contentHash],
              (err) => {
                if (err) reject(err);
                else resolve(row.id);
              }
            );
          } else {
            // Insert new record
            this.db.run(
              `INSERT INTO job_descriptions (content_hash, content, keywords, industry, experience_level) 
               VALUES (?, ?, ?, ?, ?)`,
              [contentHash, content, keywords, industry, experienceLevel],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          }
        }
      );
    });
  }

  // Track keyword usage
  trackKeywords(keywords) {
    const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    
    keywordArray.forEach(keyword => {
      this.db.get(
        'SELECT id FROM keyword_usage WHERE keyword = ?',
        [keyword],
        (err, row) => {
          if (err) return;

          if (row) {
            this.db.run(
              'UPDATE keyword_usage SET frequency = frequency + 1, last_used = CURRENT_TIMESTAMP WHERE keyword = ?',
              [keyword]
            );
          } else {
            this.db.run(
              'INSERT INTO keyword_usage (keyword) VALUES (?)',
              [keyword]
            );
          }
        }
      );
    });
  }

  // Track conversions
  trackConversion(sessionId, eventType) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO conversions (session_id, event_type) VALUES (?, ?)',
        [sessionId, eventType],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Analytics queries
  getTailoringStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          COUNT(*) as total_tailoring_attempts,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tailoring,
          AVG(processing_time_ms) as avg_processing_time,
          AVG(resume_length) as avg_resume_length,
          AVG(job_description_length) as avg_job_length
        FROM tailoring_events
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });
  }

  getTopKeywords(limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT keyword, frequency, last_used
        FROM keyword_usage
        ORDER BY frequency DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getPopularJobDescriptions(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT content, keywords, industry, experience_level, usage_count, last_seen
        FROM job_descriptions
        ORDER BY usage_count DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getConversionFunnel() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          event_type,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM conversions
        GROUP BY event_type, DATE(created_at)
        ORDER BY date DESC, event_type
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getDailyStats(days = 30) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as tailoring_attempts,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tailoring,
          AVG(processing_time_ms) as avg_processing_time
        FROM tailoring_events
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
