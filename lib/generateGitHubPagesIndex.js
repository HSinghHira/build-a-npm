const fs = require('fs');
const { marked } = require('marked');

function generateGitHubPagesIndex(
  content,
  title = 'Documentation',
  description = '',
  authorName = 'Unknown Author',
  license = 'MIT',
  licenseText = '',
  repositoryUrl = 'https://github.com/username/repository',
  main = 'index.js',
  authorUrl = 'https://me.hsinghhira.me', // Default to provided author URL
  homepageUrl = '' // Added for homepage URL fallback
) {
  // Configure marked options for better parsing
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    headerPrefix: '',
  });

  // Append License section to content
  const licenseSection = `\n## 📄 License\n\n${licenseText}`;
  const htmlContent = marked(content + licenseSection);

  // Generate keywords from description (simple split for demo purposes)
  const keywords = description.split(/\s+/).slice(0, 10).join(', ');

  // Extract repository owner and name for og:url and avatar
  const repoPath =
    repositoryUrl.split('/').slice(-2).join('/') || 'username/repository';
  const repoOwner = repositoryUrl.split('/')[3] || 'username';

  // Determine WEBSITE_URL: use authorUrl, then homepageUrl, then repositoryUrl, then default
  const websiteUrl =
    authorUrl || homepageUrl || repositoryUrl || 'https://hsinghhira.me';

  // Construct og:image URL
  const ogImageUrl = `https://dynamic-og-image-generator.vercel.app/api/generate?title=${encodeURIComponent(title)}&author=${encodeURIComponent(authorName)}&avatar=https://github.com/${repoOwner}.png&websiteUrl=${encodeURIComponent(websiteUrl)}&theme=github`;

  // Construct canonical URL (using websiteUrl for consistency)
  const canonicalUrl = websiteUrl;

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}, ${license}, documentation">
  <meta name="author" content="${authorName}">
  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}">
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="https://git.hsinghhira.me/build-a-npm/favicon.png">
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://github.com/${repoPath}">
  <meta property="og:site_name" content="${title}">
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "name": "${title}",
      "description": "${description}",
      "author": {
        "@type": "Person",
        "name": "${authorName}"
      },
      "license": "https://spdx.org/licenses/${license}.html",
      "codeRepository": "${repositoryUrl}",
      "programmingLanguage": "${main.endsWith('.ts') ? 'TypeScript' : 'JavaScript'}"
    }
  </script>
  <style>
    :root {
      --bg-light: #ffffff;
      --bg-dark: #0f0f23;
      --text-light: #2c3e50;
      --text-dark: #e8e8e8;
      --accent: #667eea;
      --accent-hover: #764ba2;
      --code-bg-light: #f8f9fa;
      --code-bg-dark: #1a1a2e;
      --border-color-light: #e1e8ed;
      --border-color-dark: #2a2a3e;
      --header-bg-light: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --header-bg-dark: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --nav-bg-light: rgba(102, 126, 234, 0.03);
      --nav-bg-dark: rgba(26, 26, 46, 0.6);
      --shadow-light: 0 4px 6px rgba(0, 0, 0, 0.05);
      --shadow-dark: 0 4px 6px rgba(0, 0, 0, 0.3);
      --table-stripe-light: #f8f9fa;
      --table-stripe-dark: #1a1a2e;
    }

    [data-theme="light"] {
      --bg: var(--bg-light);
      --text: var(--text-light);
      --code-bg: var(--code-bg-light);
      --border-color: var(--border-color-light);
      --header-bg: var(--header-bg-light);
      --nav-bg: var(--nav-bg-light);
      --shadow: var(--shadow-light);
      --table-stripe: var(--table-stripe-light);
    }

    [data-theme="dark"] {
      --bg: var(--bg-dark);
      --text: var(--text-dark);
      --code-bg: var(--code-bg-dark);
      --border-color: var(--border-color-dark);
      --header-bg: var(--header-bg-dark);
      --nav-bg: var(--nav-bg-dark);
      --shadow: var(--shadow-dark);
      --table-stripe: var(--table-stripe-dark);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      background: var(--header-bg);
      color: white;
      padding: 2rem 0;
      text-align: center;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
      opacity: 0.3;
    }

    .header-content {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .header h1 {
      margin: 0;
      font-size: 3rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      border: none;
      padding: 0;
    }

    .header p {
      margin: 1rem 0 0 0;
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .menu-toggle {
      position: fixed;
      top: 1.5rem;
      left: 1.5rem;
      z-index: 1004;
      background: rgba(102, 126, 234, 0.95);
      backdrop-filter: blur(10px);
      border: none;
      width: 50px;
      height: 50px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .menu-toggle:hover {
      background: rgba(118, 75, 162, 0.95);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
    }

    .menu-toggle:active {
      transform: translateY(0);
    }

    .hamburger {
      width: 20px;
      height: 16px;
      position: relative;
      transform: rotate(0deg);
      transition: 0.3s ease-in-out;
    }

    .hamburger span {
      display: block;
      position: absolute;
      height: 2px;
      width: 100%;
      background: white;
      border-radius: 2px;
      opacity: 1;
      left: 0;
      transform: rotate(0deg);
      transition: 0.3s ease-in-out;
    }

    .hamburger span:nth-child(1) {
      top: 0px;
    }

    .hamburger span:nth-child(2) {
      top: 7px;
    }

    .hamburger span:nth-child(3) {
      top: 14px;
    }

    .menu-toggle.active .hamburger span:nth-child(1) {
      top: 7px;
      transform: rotate(135deg);
    }

    .menu-toggle.active .hamburger span:nth-child(2) {
      opacity: 0;
      left: -20px;
    }

    .menu-toggle.active .hamburger span:nth-child(3) {
      top: 7px;
      transform: rotate(-135deg);
    }

    nav {
      width: 320px;
      padding: 0;
      background: var(--nav-bg);
      backdrop-filter: blur(15px);
      border-right: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      height: auto;
      max-height: none;
      overflow-y: visible;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow);
    }

    .nav-header {
      padding: 2rem 2rem 1rem 2rem;
      border-bottom: 1px solid var(--border-color);
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      position: relative;
    }

    .nav-header h3 {
      margin: 0 0 1rem 0;
      color: var(--accent);
      font-weight: 700;
      font-size: 1.2rem;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .nav-close {
      display: none;
      position: absolute;
      top: 2rem;
      right: 2rem;
      background: rgba(102, 126, 234, 0.95);
      backdrop-filter: blur(10px);
      border: none;
      width: 42px;
      height: 42px;
      border-radius: 8px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      z-index: 1005;
    }

    .nav-close:hover {
      background: rgba(118, 75, 162, 0.95);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .nav-close:active {
      transform: translateY(0);
    }

    .nav-close .close-icon {
      width: 16px;
      height: 16px;
      position: relative;
    }

    .nav-close .close-icon span {
      display: block;
      position: absolute;
      height: 2px;
      width: 100%;
      background: white;
      border-radius: 2px;
      top: 50%;
      left: 0;
      transition: 0.3s ease-in-out;
    }

    .nav-close .close-icon span:nth-child(1) {
      transform: translateY(-50%) rotate(45deg);
    }

    .nav-close .close-icon span:nth-child(2) {
      transform: translateY(-50%) rotate(-45deg);
    }

    .nav-close.show {
      display: flex;
    }

    .theme-toggle {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .theme-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .theme-toggle:active {
      transform: translateY(0);
    }

    .nav-content {
      padding: 2rem;
    }

    nav ul {
      list-style: none;
      padding-left: 0;
      margin: 0;
    }

    nav li {
      margin: 0.5rem 0;
    }

    nav a {
      color: var(--text);
      text-decoration: none;
      padding: 0.5rem 1.25rem;
      display: block;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      font-size: 0.95rem;
      position: relative;
      overflow: hidden;
    }

    nav a::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: -1;
    }

    nav a:hover::before {
      left: 0;
    }

    nav a:hover {
      color: white;
      transform: translateX(8px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .container {
      display: flex;
      min-height: calc(100vh - 180px);
    }

    main {
      flex: 1;
      padding: 3rem;
      max-width: 900px;
      margin: auto;
    }

    h1,
    h2,
    h3,
    h4 {
      font-weight: 600;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      position: relative;
    }

    h2 {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 0.5rem;
      color: var(--accent);
    }

    h3 {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.3rem;
    }

    p,
    ul,
    ol,
    blockquote {
      line-height: 1.8;
      margin-bottom: 1.5rem;
    }

    blockquote {
      border-left: 4px solid var(--accent);
      padding: 1rem 1.5rem;
      background: var(--code-bg);
      margin: 1.5rem 0;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      position: relative;
    }

    blockquote::before {
      content: '"';
      font-size: 3rem;
      color: var(--accent);
      position: absolute;
      top: -0.5rem;
      left: 0.5rem;
      opacity: 0.3;
    }

    code {
      background-color: var(--code-bg);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.9em;
      color: var(--accent);
      font-weight: 500;
    }

    pre {
      background: var(--code-bg);
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 2rem 0;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.9em;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
    }

    pre code {
      background: none;
      padding: 0;
      color: var(--text);
    }

    .table-container {
      overflow-x: auto;
      margin: 2rem 0;
      border-radius: 8px;
      box-shadow: var(--shadow);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg);
      font-size: 0.95rem;
    }

    th,
    td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      background: var(--accent);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 0.85rem;
    }

    tr:nth-child(even) {
      background: var(--table-stripe);
    }

    a {
      color: var(--accent);
      text-decoration: none;
      transition: color 0.3s ease;
    }

    a:hover {
      color: var(--accent-hover);
      text-decoration: none;
    }

    ul,
    ol {
      padding-left: 1.5rem;
    }

    li {
      margin-bottom: 0.5rem;
    }

    .badge {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      margin: 0 0.25rem;
    }

    footer {
      text-align: center;
      padding: 2rem;
      font-size: 0.9em;
      color: var(--text);
      opacity: 0.7;
      border-top: 1px solid var(--border-color);
      margin-top: 3rem;
      background: var(--nav-bg);
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 2rem;
      }

      .header p {
        font-size: 1rem;
      }

      nav {
        position: fixed;
        left: -100%;
        top: 0;
        bottom: 0;
        background: var(--bg);
        width: 320px;
        z-index: 1003;
        transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-right: 1px solid var(--border-color);
        box-shadow: 4px 0 25px rgba(0, 0, 0, 0.25);
        height: 100%;
        overflow-y: auto;
      }

      nav.show {
        left: 0;
      }

      .nav-close {
        display: none;
      }

      .menu-toggle.active {
        opacity: 0;
        visibility: hidden;
        transform: translateY(-2px) scale(0.8);
        pointer-events: none;
      }

      .container {
        flex-direction: column;
      }

      main {
        padding: 2rem 1rem;
        margin-left: 0;
      }

      .menu-toggle {
        display: flex;
      }
    }

    @media (min-width: 769px) {
      .menu-toggle {
        display: none;
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    main>* {
      animation: fadeInUp 0.6s ease-out;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1002;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .overlay.show {
      opacity: 1;
      visibility: visible;
    }
  </style>
</head>
<body>
  <div class="overlay" id="overlay"></div>
  <button class="menu-toggle" id="menuToggle" onclick="toggleNav()">
    <div class="hamburger">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </button>
  <div class="header">
    <div class="header-content">
      <h1>📦 ${title}</h1>
      <p>${description}</p>
    </div>
  </div>
  <div class="container">
    <nav id="toc">
      <div class="nav-header">
        <button class="theme-toggle" onclick="toggleTheme()">
          <span id="themeIcon">🌙</span>
          <span id="themeText">Dark Mode</span>
        </button>
      </div>
      <div class="nav-content">
        <ul id="tocList">
          <!-- Table of contents will be generated by JavaScript -->
        </ul>
      </div>
    </nav>
    <button class="nav-close" onclick="closeNav()">
      <div class="close-icon">
        <span></span>
        <span></span>
      </div>
    </button>
    <main>
      ${htmlContent}
      <footer>
        <p>&copy; 2025 ${license} — ${title} — Created by <a href="${encodeURIComponent(websiteUrl)}" target="_blank">${authorName}</a></p>
        <p>Powered with ❤️ & <a href="https://www.npmjs.com/package/build-a-npm" target="_blank">Build-a-NPM</a></p>
      </footer>
    </main>
  </div>
  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      const themeIcon = document.getElementById("themeIcon");
      const themeText = document.getElementById("themeText");
      if (next === "dark") {
        themeIcon.textContent = "🌙";
        themeText.textContent = "Dark Mode";
      } else {
        themeIcon.textContent = "☀️";
        themeText.textContent = "Light Mode";
      }
      document.body.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        document.body.style.transition = '';
      }, 300);
    }

    function toggleNav() {
      const nav = document.getElementById("toc");
      const overlay = document.getElementById("overlay");
      const menuToggle = document.getElementById("menuToggle");
      const closeBtn = document.querySelector(".nav-close");
      nav.classList.toggle("show");
      overlay.classList.toggle("show");
      menuToggle.classList.toggle("active");
      closeBtn.classList.toggle("show");
      if (nav.classList.contains("show")) {
        overlay.addEventListener('click', closeNav);
      } else {
        overlay.removeEventListener('click', closeNav);
      }
    }

    function closeNav() {
      const nav = document.getElementById("toc");
      const overlay = document.getElementById("overlay");
      const menuToggle = document.getElementById("menuToggle");
      const closeBtn = document.querySelector(".nav-close");
      nav.classList.remove("show");
      overlay.classList.remove("show");
      menuToggle.classList.remove("active");
      closeBtn.classList.remove("show");
      overlay.removeEventListener('click', closeNav);
    }

    function generateTOC() {
      const headers = document.querySelectorAll('main h2');
      const tocList = document.getElementById('tocList');
      
      headers.forEach((header, index) => {
        // Create an ID if it doesn't exist
        if (!header.id) {
          header.id = \`header-\${index}\`;
        }
        
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = \`#\${header.id}\`;
        a.textContent = header.textContent;
        
        // Add some styling based on header level
        const level = parseInt(header.tagName.charAt(1));
        if (level > 2) {
          a.style.paddingLeft = \`\${(level - 2) * 1}rem\`;
          a.style.fontSize = '0.9rem';
          a.style.opacity = '0.8';
        }
        
        li.appendChild(a);
        tocList.appendChild(li);
      });
    }

    function setupSmoothScrolling() {
      document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            if (window.innerWidth <= 768) {
              closeNav();
            }
          }
        });
      });
    }

    function initializeTheme() {
      const saved = localStorage.getItem("theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
      const themeIcon = document.getElementById("themeIcon");
      const themeText = document.getElementById("themeText");
      if (saved === "dark") {
        themeIcon.textContent = "🌙";
        themeText.textContent = "Dark Mode";
      } else {
        themeIcon.textContent = "☀️";
        themeText.textContent = "Light Mode";
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      generateTOC();
      setupSmoothScrolling();
      initializeTheme();
      document.querySelectorAll('table').forEach(table => {
        if (!table.parentElement.classList.contains('table-container')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'table-container';
          table.parentNode.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }
      });
    });

    window.addEventListener('load', function() {
      document.body.style.opacity = '0';
      document.body.style.transform = 'translateY(20px)';
      setTimeout(() => {
        document.body.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
      }, 100);
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeNav();
      }
    });
  </script>
</body>
</html>`;
}

module.exports = { generateGitHubPagesIndex };
