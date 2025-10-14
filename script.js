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
      
    } catch (error) {
      console.error('Error:', error);
      outputDiv.innerHTML = `<p style="color: red;">Error: ${error.message}. Please make sure the server is running.</p>`;
    }
  }
  