// Initialize session tracking
let sessionId = localStorage.getItem('sessionId') || generateSessionId();
localStorage.setItem('sessionId', sessionId);

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Track page view on load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify({ eventType: 'view_main' })
    });
  } catch (error) {
    console.log('Analytics tracking failed:', error);
  }
});

async function tailorResume() {
    const resume = document.getElementById('resume').value;
    const job = document.getElementById('job').value;
    
    // Show loading state
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '<p>Processing your resume... Please wait.</p>';
    
    try {
      const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          resume: resume,
          job: job
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      outputDiv.innerHTML = `<div style="white-space: pre-wrap;">${data.suggestions}</div>`;
      
      // Track successful tailoring
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({ eventType: 'successful_tailor' })
        });
      } catch (error) {
        console.log('Analytics tracking failed:', error);
      }
      
    } catch (error) {
      console.error('Error:', error);
      outputDiv.innerHTML = `<p style="color: red;">Error: ${error.message}. Please make sure the server is running.</p>`;
      
      // Track failed tailoring
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({ eventType: 'failed_tailor' })
        });
      } catch (trackingError) {
        console.log('Analytics tracking failed:', trackingError);
      }
    }
  }
  