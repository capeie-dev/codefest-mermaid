import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mermaid from 'mermaid';

// Initialize mermaid with default configuration
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Segoe UI, sans-serif'
});

// Component to render Mermaid diagrams
const MermaidDiagram = ({ chart }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.innerHTML = '';
      mermaid.render(`mermaid-${Date.now()}`, chart).then(({ svg }) => {
        ref.current.innerHTML = svg;
      });
    }
  }, [chart]);

  return <div className="mermaid-diagram" ref={ref} style={{ width: '100%', marginTop: '20px' }} />;
};

function App() {
  // Get theme from localStorage or default to dark
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('codecrusaders-theme');
    return savedTheme || 'dark';
  });
  
  // Store the mermaid diagram code
  const [mermaidCode, setMermaidCode] = useState('');
  
  // Apply theme directly and immediately when component mounts
  useEffect(() => {
    // Apply the saved or default theme
    if (theme === 'light') {
      document.documentElement.style.setProperty('--bg-color', '#f5f6fa');
      document.documentElement.style.setProperty('--text-color', '#23272f');
    } else {
      document.documentElement.style.setProperty('--bg-color', '#181a20');
      document.documentElement.style.setProperty('--text-color', '#f5f6fa');
    }
  }, [theme]);
  
  // Direct toggle function that uses CSS variables
  const toggleTheme = () => {
    if (theme === 'dark') {
      // Apply light theme immediately
      document.documentElement.style.setProperty('--bg-color', '#f5f6fa');
      document.documentElement.style.setProperty('--text-color', '#23272f');
      localStorage.setItem('codecrusaders-theme', 'light');
      setTheme('light');
    } else {
      // Apply dark theme immediately 
      document.documentElement.style.setProperty('--bg-color', '#181a20');
      document.documentElement.style.setProperty('--text-color', '#f5f6fa');
      localStorage.setItem('codecrusaders-theme', 'dark');
      setTheme('dark');
    }
  };
  
  const [projectDescription, setProjectDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSummary('');
    setImageBase64('');
    setMermaidCode('');
    setError('');
    try {
      const response = await axios.post('http://localhost:3000/generate-architecture', {
        prompt: projectDescription,
      });
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setSummary(response.data.summary);
        setImageBase64(response.data.image_base64);
        // Store the mermaid code for rendering
        setMermaidCode(response.data.mermaid);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Styles defined as objects for direct application
  const buttonContainerStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '20px 0'
  };

  const submitButtonStyle = {
    backgroundColor: '#fbc531',
    color: '#181a20',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '220px',
    display: 'block'
  };

  return (
    <div style={{transition: 'all 0.3s ease'}}>
      <div className="hero-banner">
        <div className="hero-overlay" style={{background: theme === 'dark' ? 'rgba(24,26,32, 0.55)' : 'rgba(255,255,255,0.7)'}}>
          <header className="hero-header">
            <div className="hero-title-block">
              <h1 style={{color: 'var(--text-color)'}}>Welcome to CodeCrusaders</h1>
              <p style={{color: theme === 'dark' ? '#e1e1e6' : '#333333'}}>Architecture diagrams, code generation, and reviews at your fingertips.</p>
            </div>
            <button
              className="theme-toggle"
              aria-label="Toggle day/night mode"
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none', 
                fontSize: '2rem',
                cursor: 'pointer',
                color: 'var(--text-color)'
              }}
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </button>
          </header>
        </div>
      </div>
      <div className="app-container">
        <h2 style={{color: 'var(--text-color)', width: '100%', textAlign: 'center'}}>
          RAG Architecture Generator
        </h2>
        <form onSubmit={handleSubmit} style={{width: '100%', textAlign: 'center'}}>
          <textarea
            rows="6"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Describe your project..."
            required
            style={{
              display: 'block',
              width: '90%',
              maxWidth: '650px',
              margin: '0 auto 20px auto',
              backgroundColor: theme === 'dark' ? '#23272f' : '#ffffff',
              color: 'var(--text-color)',
              border: `1px solid ${theme === 'dark' ? '#33384d' : '#e1e1e6'}`,
              borderRadius: '8px',
              padding: '12px',
              height: '120px'
            }}
          />
          <div style={buttonContainerStyle}>
            <button 
              type="submit" 
              disabled={loading}
              style={loading ? {...submitButtonStyle, backgroundColor: '#888', color: '#ccc', cursor: 'not-allowed'} : submitButtonStyle}
            >
              {loading ? 'Generating...' : 'Generate Architecture'}
            </button>
          </div>
        </form>
        {error && <p style={{color: '#ff7675', marginTop: '16px', textAlign: 'center'}}>{error}</p>}
        {summary && (
          <div style={{
            backgroundColor: theme === 'dark' ? '#23272f' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#33384d' : '#e1e1e6'}`,
            borderRadius: '10px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            padding: '18px 24px',
            marginTop: '32px',
            marginBottom: '24px'
          }}>
            <h3 style={{color: 'var(--text-color)'}}>Summary</h3>
            <p style={{color: theme === 'dark' ? '#d1d2d6' : '#333333'}}>{summary}</p>
          </div>
        )}
        {mermaidCode && (
          <div style={{
            backgroundColor: theme === 'dark' ? '#23272f' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#33384d' : '#e1e1e6'}`,
            borderRadius: '10px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            padding: '18px 24px',
            marginTop: '32px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{color: 'var(--text-color)'}}>Architecture Diagram</h3>
            
            {/* Render the Mermaid diagram using our component */}
            <MermaidDiagram chart={mermaidCode} />
            
            {/* Display the raw Mermaid code for reference */}
            <details style={{marginTop: '20px', textAlign: 'left'}}>
              <summary style={{color: 'var(--text-color)', cursor: 'pointer'}}>View Diagram Code</summary>
              <pre style={{
                backgroundColor: theme === 'dark' ? '#1a1e24' : '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                overflowX: 'auto',
                color: theme === 'dark' ? '#e1e1e6' : '#333'
              }}>
                {mermaidCode}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
