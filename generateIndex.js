const fs = require('fs');
const { marked } = require('marked');

try {
  if (!fs.existsSync('WEBPAGE.md')) {
    console.error('❌ WEBPAGE.md not found. Please create it to generate index.html.');
    process.exit(1);
  }

  const webpageContent = fs.readFileSync('WEBPAGE.md', 'utf-8');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const title = `${packageJson.name} Documentation`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0 auto;
      max-width: 800px;
      padding: 20px;
      background-color: #f9f9f9;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #333;
    }
    code {
      background-color: #f0f0f0;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre {
      background-color: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
${marked(webpageContent)}
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('✅ Generated index.html from WEBPAGE.md');
} catch (err) {
  console.error('❌ Error generating index.html:', err.message);
  process.exit(1);
}
