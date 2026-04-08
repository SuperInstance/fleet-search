export interface Env {
  SEARCH_INDEX: KVNamespace;
  VESSEL_DATA: KVNamespace;
}

interface SearchDocument {
  id: string;
  vessel: string;
  title: string;
  content: string;
  type: 'documentation' | 'code' | 'config' | 'api';
  path: string;
  lastModified: string;
  relevanceScore?: number;
}

interface SearchResult {
  results: SearchDocument[];
  total: number;
  query: string;
  facets: {
    vessel: Record<string, number>;
    type: Record<string, number>;
  };
}

interface VesselInfo {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'offline';
  lastSeen: string;
  documentationCount: number;
}

const HTML_TEMPLATE = (content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self';">
  <title>Fleet Search</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    :root {
      --dark: #0a0a0f;
      --darker: #050508;
      --accent: #6366f1;
      --accent-light: #818cf8;
      --light: #f8fafc;
      --gray: #94a3b8;
      --gray-dark: #475569;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: var(--dark);
      color: var(--light);
      min-height: 100vh;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    header {
      background: var(--darker);
      border-bottom: 1px solid rgba(99, 102, 241, 0.1);
      padding: 1.5rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--accent), var(--accent-light));
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
    }
    
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent), var(--accent-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .nav-links {
      display: flex;
      gap: 2rem;
    }
    
    .nav-links a {
      color: var(--gray);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    
    .nav-links a:hover {
      color: var(--accent-light);
    }
    
    .hero {
      padding: 4rem 0;
      text-align: center;
      background: linear-gradient(180deg, var(--dark) 0%, var(--darker) 100%);
    }
    
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, var(--light), var(--accent-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .hero p {
      font-size: 1.25rem;
      color: var(--gray);
      max-width: 600px;
      margin: 0 auto 2rem;
    }
    
    .search-box {
      max-width: 700px;
      margin: 0 auto;
      position: relative;
    }
    
    .search-input {
      width: 100%;
      padding: 1.25rem 1.5rem;
      padding-right: 60px;
      font-size: 1.1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      color: var(--light);
      font-family: 'Inter', sans-serif;
      transition: all 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(255, 255, 255, 0.08);
    }
    
    .search-button {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--accent);
      border: none;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      color: white;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .search-button:hover {
      background: var(--accent-light);
    }
    
    .features {
      padding: 4rem 0;
      background: var(--darker);
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }
    
    .feature-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(99, 102, 241, 0.1);
      border-radius: 12px;
      padding: 2rem;
      transition: transform 0.2s, border-color 0.2s;
    }
    
    .feature-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.3);
    }
    
    .feature-icon {
      width: 48px;
      height: 48px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      color: var(--accent);
    }
    
    .feature-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      color: var(--light);
    }
    
    .feature-card p {
      color: var(--gray);
    }
    
    .results-section {
      padding: 3rem 0;
    }
    
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    
    .results-count {
      color: var(--gray);
    }
    
    .results-grid {
      display: grid;
      gap: 1.5rem;
    }
    
    .result-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(99, 102, 241, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
      transition: border-color 0.2s;
    }
    
    .result-card:hover {
      border-color: rgba(99, 102, 241, 0.3);
    }
    
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    
    .result-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--accent-light);
      text-decoration: none;
    }
    
    .result-title:hover {
      text-decoration: underline;
    }
    
    .result-meta {
      display: flex;
      gap: 1rem;
      color: var(--gray);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    
    .result-type {
      background: rgba(99, 102, 241, 0.1);
      color: var(--accent-light);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .result-vessel {
      background: rgba(148, 163, 184, 0.1);
      color: var(--gray);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .result-content {
      color: var(--gray);
      line-height: 1.6;
    }
    
    .result-highlight {
      background: rgba(99, 102, 241, 0.2);
      color: var(--accent-light);
      padding: 0.125rem 0.25rem;
      border-radius: 4px;
    }
    
    .facets {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }
    
    .facet {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 20px;
      padding: 0.5rem 1rem;
      color: var(--gray);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .facet:hover, .facet.active {
      background: rgba(99, 102, 241, 0.1);
      border-color: var(--accent);
      color: var(--accent-light);
    }
    
    .facet-count {
      margin-left: 0.5rem;
      background: rgba(99, 102, 241, 0.2);
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
      font-size: 0.75rem;
    }
    
    .footer {
      background: var(--darker);
      border-top: 1px solid rgba(99, 102, 241, 0.1);
      padding: 3rem 0;
      margin-top: 4rem;
    }
    
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 2rem;
    }
    
    .footer-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .footer-text {
      color: var(--gray);
      font-size: 0.875rem;
    }
    
    .footer-links {
      display: flex;
      gap: 2rem;
    }
    
    .footer-links a {
      color: var(--gray);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s;
    }
    
    .footer-links a:hover {
      color: var(--accent-light);
    }
    
    .api-section {
      padding: 3rem 0;
    }
    
    .api-endpoint {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(99, 102, 241, 0.1);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .api-method {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.875rem;
      margin-right: 1rem;
    }
    
    .api-path {
      font-family: monospace;
      color: var(--accent-light);
    }
    
    .api-desc {
      color: var(--gray);
      margin-top: 0.5rem;
    }
    
    .health-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border-radius: 20px;
      font-weight: 600;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2.5rem;
      }
      
      .header-content {
        flex-direction: column;
        gap: 1rem;
      }
      
      .nav-links {
        gap: 1rem;
      }
      
      .footer-content {
        flex-direction: column;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">F</div>
          <div class="logo-text">Fleet Search</div>
        </div>
        <nav class="nav-links">
          <a href="/">Search</a>
          <a href="/api/vessels">Vessels</a>
          <a href="/api/index">Index Status</a>
          <a href="/health">Health</a>
        </nav>
      </div>
    </div>
  </header>
  
  ${content}
  
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-logo">
          <div class="logo-icon">F</div>
          <div class="logo-text">Fleet Search</div>
        </div>
        <div class="footer-text">
          Search across all vessel documentation, code, and configurations
        </div>
        <div class="footer-links">
          <a href="/api/search?q=">API</a>
          <a href="/api/vessels">Status</a>
          <a href="/health">Health</a>
        </div>
      </div>
    </div>
  </footer>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const searchForm = document.querySelector('.search-box');
      const searchInput = document.querySelector('.search-input');
      
      if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function(e) {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query) {
            window.location.href = '/api/search?q=' + encodeURIComponent(query);
          }
        });
      }
      
      // Highlight search terms in results
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      if (query) {
        const terms = query.toLowerCase().split(/\\s+/).filter(term => term.length > 2);
        const contentElements = document.querySelectorAll('.result-content');
        
        contentElements.forEach(element => {
          let html = element.innerHTML;
          terms.forEach(term => {
            const regex = new RegExp('(' + term + ')', 'gi');
            html = html.replace(regex, '<span class="result-highlight">$1</span>');
          });
          element.innerHTML = html;
        });
      }
    });
  </script>
</body>
</html>`;

const HOME_PAGE = HTML_TEMPLATE(`
  <section class="hero">
    <div class="container">
      <h1>Fleet Search</h1>
      <p>Full-text search across all vessel documentation, code, configurations, and API endpoints. Real-time indexing and relevance ranking.</p>
      <form class="search-box" action="/api/search" method="GET">
        <input type="text" name="q" class="search-input" placeholder="Search across all vessels..." autocomplete="off">
        <button type="submit" class="search-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
      </form>
    </div>
  </section>
  
  <section class="features">
    <div class="container">
      <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem; color: var(--light);">Features</h2>
      <p style="text-align: center; color: var(--gray); max-width: 600px; margin: 0 auto 3rem;">Powerful search capabilities for your entire fleet</p>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <h3>Full-Text Search</h3>
          <p>Search across all documentation, code files, and configurations with intelligent tokenization and stemming.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
            </svg>
          </div>
          <h3>Code Search</h3>
          <p>Syntax-aware code searching with support for multiple programming languages and code structure analysis.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
            </svg>
          </div>
          <h3>API Endpoint Index</h3>
          <p>Automatically index and search across all API endpoints, their documentation, and usage examples.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox
const sh = {"Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-ancestors 'none'","X-Frame-Options":"DENY"};
export default { async fetch(r: Request) { const u = new URL(r.url); if (u.pathname==='/health') return new Response(JSON.stringify({status:'ok'}),{headers:{'Content-Type':'application/json',...sh}}); return new Response(html,{headers:{'Content-Type':'text/html;charset=UTF-8',...sh}}); }};