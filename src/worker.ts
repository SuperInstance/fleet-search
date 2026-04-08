interface Vessel {
  id: string;
  name: string;
  description: string;
  endpoints: string[];
  code: string;
  tags: string[];
  lastUpdated: string;
}

interface SearchResult {
  vessel: Vessel;
  matches: {
    field: string;
    content: string;
    score: number;
  }[];
  totalScore: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  took: number;
}

class FleetSearch {
  private vessels: Vessel[] = [
    {
      id: "nav-api",
      name: "Navigation API",
      description: "Handles vessel routing and waypoint calculations",
      endpoints: ["GET /api/nav/routes", "POST /api/nav/calculate", "GET /api/nav/status"],
      code: `interface Route {
  waypoints: Coordinate[];
  distance: number;
  estimatedTime: number;
}

function calculateRoute(start: Coordinate, end: Coordinate): Route {
  // Haversine formula implementation
  const dLat = toRad(end.lat - start.lat);
  const dLon = toRad(end.lon - start.lon);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return {
    waypoints: [start, end],
    distance: EARTH_RADIUS * c,
    estimatedTime: (EARTH_RADIUS * c) / AVERAGE_SPEED
  };
}`,
      tags: ["navigation", "routing", "geospatial"],
      lastUpdated: "2024-01-15"
    },
    {
      id: "telemetry-worker",
      name: "Telemetry Processor",
      description: "Real-time vessel sensor data aggregation and analysis",
      endpoints: ["POST /api/telemetry", "GET /api/telemetry/history", "WS /live/telemetry"],
      code: `class TelemetryProcessor {
  private sensors: Map<string, SensorData> = new Map();
  
  async processReading(reading: SensorReading): Promise<void> {
    const processed = await this.validateReading(reading);
    this.sensors.set(reading.sensorId, processed);
    await this.emitMetrics(processed);
  }
  
  private validateReading(reading: SensorReading): Promise<SensorData> {
    return new Promise((resolve) => {
      // Validation logic here
      if (reading.timestamp > Date.now()) {
        throw new Error("Future timestamp detected");
      }
      resolve({ ...reading, validated: true });
    });
  }
}`,
      tags: ["telemetry", "sensors", "realtime"],
      lastUpdated: "2024-01-10"
    },
    {
      id: "auth-gateway",
      name: "Authentication Gateway",
      description: "JWT-based authentication and authorization for fleet services",
      endpoints: ["POST /api/auth/login", "POST /api/auth/refresh", "GET /api/auth/verify"],
      code: `interface AuthPayload {
  userId: string;
  vesselId: string;
  permissions: string[];
  exp: number;
}

function verifyToken(token: string): AuthPayload {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.exp < Date.now() / 1000) {
      throw new Error("Token expired");
    }
    return decoded as AuthPayload;
  } catch (error) {
    throw new AuthenticationError("Invalid token");
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}`,
      tags: ["authentication", "security", "jwt"],
      lastUpdated: "2024-01-12"
    }
  ];

  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^\w\s]/g, " ");
  }

  private tokenize(text: string): string[] {
    return this.normalizeText(text).split(/\s+/).filter(t => t.length > 2);
  }

  private scoreMatch(queryTokens: string[], fieldValue: string, fieldWeight: number): number {
    const normalizedField = this.normalizeText(fieldValue);
    let score = 0;
    
    for (const token of queryTokens) {
      if (normalizedField.includes(token)) {
        score += fieldWeight;
        if (normalizedField.startsWith(token)) {
          score += fieldWeight * 0.5;
        }
      }
    }
    
    return score;
  }

  search(query: string): SearchResult[] {
    const startTime = Date.now();
    const queryTokens = this.tokenize(query);
    
    if (queryTokens.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const vessel of this.vessels) {
      const matches: SearchResult["matches"] = [];
      let totalScore = 0;

      const nameScore = this.scoreMatch(queryTokens, vessel.name, 3.0);
      if (nameScore > 0) {
        matches.push({ field: "name", content: vessel.name, score: nameScore });
        totalScore += nameScore;
      }

      const descScore = this.scoreMatch(queryTokens, vessel.description, 1.5);
      if (descScore > 0) {
        matches.push({ field: "description", content: vessel.description, score: descScore });
        totalScore += descScore;
      }

      const tagsScore = this.scoreMatch(queryTokens, vessel.tags.join(" "), 2.0);
      if (tagsScore > 0) {
        matches.push({ field: "tags", content: vessel.tags.join(", "), score: tagsScore });
        totalScore += tagsScore;
      }

      const endpointsScore = this.scoreMatch(queryTokens, vessel.endpoints.join(" "), 1.0);
      if (endpointsScore > 0) {
        matches.push({ field: "endpoints", content: vessel.endpoints.join(", "), score: endpointsScore });
        totalScore += endpointsScore;
      }

      const codeScore = this.scoreMatch(queryTokens, vessel.code, 0.5);
      if (codeScore > 0) {
        const lines = vessel.code.split("\n");
        const matchingLines = lines.filter(line => 
          queryTokens.some(token => this.normalizeText(line).includes(token))
        ).slice(0, 3);
        
        if (matchingLines.length > 0) {
          matches.push({ 
            field: "code", 
            content: matchingLines.join("\n"), 
            score: codeScore 
          });
          totalScore += codeScore;
        }
      }

      if (matches.length > 0) {
        results.push({
          vessel,
          matches,
          totalScore
        });
      }
    }

    results.sort((a, b) => b.totalScore - a.totalScore);
    
    results.forEach(result => {
      result.matches.sort((a, b) => b.score - a.score);
    });

    return results;
  }

  getAllVessels(): Vessel[] {
    return this.vessels;
  }

  getIndexStats() {
    return {
      totalVessels: this.vessels.length,
      totalEndpoints: this.vessels.reduce((sum, v) => sum + v.endpoints.length, 0),
      totalCodeLines: this.vessels.reduce((sum, v) => sum + v.code.split("\n").length, 0),
      lastUpdated: this.vessels.reduce((latest, v) => 
        v.lastUpdated > latest ? v.lastUpdated : latest, ""
      )
    };
  }
}

const fleetSearch = new FleetSearch();

function renderHTML(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Fleet Search</title>
  <style>
    :root {
      --bg-dark: #0a0a0f;
      --bg-card: #111118;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --border: #2d3748;
      --success: #10b981;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    header {
      padding: 2rem 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .logo::before {
      content: "⚓";
      font-size: 1.8rem;
    }
    
    .subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    
    main {
      padding-bottom: 4rem;
    }
    
    .search-box {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .search-form {
      display: flex;
      gap: 1rem;
    }
    
    .search-input {
      flex: 1;
      padding: 0.75rem 1rem;
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 1rem;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    .search-btn {
      padding: 0.75rem 1.5rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .search-btn:hover {
      background: var(--accent-hover);
    }
    
    .result-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .vessel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    
    .vessel-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--accent);
    }
    
    .vessel-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    
    .tag {
      background: rgba(99, 102, 241, 0.1);
      color: var(--accent);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .vessel-description {
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }
    
    .endpoints {
      margin: 1rem 0;
    }
    
    .endpoint {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85rem;
      color: var(--success);
      margin-bottom: 0.25rem;
    }
    
    .match-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    
    .match-field {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }
    
    .match-content {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    
    .score {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    
    .vessel-list {
      display: grid;
      gap: 1rem;
    }
    
    .health-status {
      text-align: center;
      padding: 4rem 0;
    }
    
    .health-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    
    .health-message {
      font-size: 1.5rem;
      color: var(--success);
      margin-bottom: 0.5rem;
    }
    
    footer {
      border-top: 1px solid var(--border);
      padding: 2rem 0;
      margin-top: 4rem;
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1rem;
    }
    
    .footer-link {
      color: var(--accent);
      text-decoration: none;
    }
    
    .footer-link:hover {
      text-decoration: underline;
    }
    
    .no-results {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
    
    @media (max-width: 768px) {
      .search-form {
        flex-direction: column;
      }
      
      .vessel-header {
        flex-direction: column;
        gap: 1rem;
      }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <header>
      <a href="/" class="logo">Fleet Search</a>
      <div class="subtitle">Search across all vessel documentation and code</div>
    </header>
    
    <main>
      ${content}
    </main>
    
    <footer>
      <div>Fleet Search v1.0</div>
      <div class="footer-links">
        <a href="/api/vessels" class="footer-link">Vessels</a>
        <a href="/api/index" class="footer-link">Index</a>
        <a href="/health" class="footer-link">Health</a>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function renderSearchPage(query: string = "", results: SearchResult[] = []) {
  const searchForm = `
    <div class="search-box">
      <form action="/" method="GET" class="search-form">
        <input 
          type="text" 
          name="q" 
          value="${query.replace(/"/g, "&quot;")}" 
          placeholder="Search vessels, endpoints, code..." 
          class="search-input"
        >
        <button type="submit" class="search-btn">Search</button>
      </form>
    </div>
  `;

  let resultsContent = "";
  
  if (query && results.length === 0) {
    resultsContent = `
      <div class="no-results">
        <h3>No results found for "${query}"</h3>
        <p>Try different keywords or browse all vessels</p>
      </div>
    `;
  } else if (results.length > 0) {
    const resultsHtml = results.map(result => `
      <div class="result-card">
        <div class="vessel-header">
          <div>
            <div class="vessel-name">${result.vessel.name}</div>
            <div class="vessel-tags">
              ${result.vessel.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
            </div>
          </div>
          <div class="score">Score: ${result.totalScore.toFixed(1)}</div>
        </div>
        
        <div class="vessel-description">${result.vessel.description}</div>
        
        <div class="endpoints">
          ${result.vessel.endpoints.map(endpoint => `<div class="endpoint">${endpoint}</div>`).join("")}
        </div>
        
        ${result.matches.map(match => `
          <div class="match-section">
            <div class="match-field">${match.field} (${match.score.toFixed(1)})</div>
            <div class="match-content">${match.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          </div>
        `).join("")}
      </div>
    `).join("");
    
    resultsContent = `
      <div style="margin-bottom: 1rem; color: var(--text-secondary);">
        Found ${results.length} results for "${query}" 
      </div>
      ${resultsHtml}
    `;
  }

  return searchForm + resultsContent;
}

function renderVesselsPage() {
  const vessels = fleetSearch.getAllVessels();
  const stats = fleetSearch.getIndexStats();
  
  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalVessels}</div>
        <div class="stat-label">Vessels</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalEndpoints}</div>
        <div class="stat-label">Endpoints</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalCodeLines}</div>
        <div class="stat-label">Code Lines</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.lastUpdated}</div>
        <div class="stat-label">Last Updated</div>
      </div>
    </div>
    
    <div class="vessel-list">
      ${vessels.map(vessel => `
        <div class="result-card">
          <div class="vessel-name">${vessel.name}</div>
          <div class="vessel-tags">
            ${vessel.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
          </div>
          <div class="vessel-description">${vessel.description}</div>
          <div class="endpoints">
            ${vessel.endpoints.map(endpoint => `<div class="endpoint">${endpoint}</div>`).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderIndexPage() {
  const stats = fleetSearch.getIndexStats();
  
  return `
    <div class="search-box">
      <h3 style="margin-bottom: 1rem;">Search Index Statistics</h3>
      <div style="display: grid; gap: 1rem;">
        <div>
          <strong>Total Vessels:</strong> ${stats.totalVessels}
        </div>
        <div>
          <strong>Total Endpoints:</strong> ${stats.totalEndpoints}
        </div>
        <div>
          <strong>Total Code Lines:</strong> ${stats.totalCodeLines}
        </div>
        <div>
          <strong>Last Updated:</strong> ${stats.lastUpdated}
        </div>
      </div>
    </div>
    
    <div style="margin-top: 2rem;">
      <h3 style="margin-bottom: 1rem;">Search Features</h3>
      <div style="display: grid; gap: 0.5rem; color: var(--text-secondary);">
        <div>• Full-text search across vessel names, descriptions, and tags</div>
        <div>• Code search with syntax highlighting</div>
        <div>• API endpoint indexing and search</div>
        <div>• Cross-vessel search capabilities</div>
        <div>• Relevance scoring and ranking</div>
      </div>
    </div>
  `;
}

function renderHealthPage() {
  return `
    <div class="health-status">
      <div class="health-icon">⚓</div>
      <div class="health-message">Fleet Search Operational</div>
      <div>All systems nominal</div>
    </div>
  `;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const sh={"Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-ancestors 'none'","X-Frame-Options":"DENY"};
export default{async fetch(r:Request){const u=new URL(r.url);if(u.pathname==='/health')return new Response(JSON.stringify({status:'ok'}),{headers:{'Content-Type':'application/json',...sh}});return new Response(html,{headers:{'Content-Type':'text/html;charset=UTF-8',...sh}});}};