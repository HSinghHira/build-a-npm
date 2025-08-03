const { marked } = require('marked');

function generateGitHubPagesIndex(readmeContent) {
  const htmlContent = marked(readmeContent);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation</title>
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
  ${htmlContent}
</body>
</html>`;
}

module.exports = { generateGitHubPagesIndex };
