function generateGitHubPagesWorkflow(answers) {
  return `name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install Dependencies
        run: npm install
      - name: Generate index.html
        run: |
          if [ -f WEBPAGE.md ]; then
            node -e "const fs = require('fs'); const { marked } = require('marked'); const webpage = fs.readFileSync('WEBPAGE.md', 'utf-8'); const html = '<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>${answers.name} Documentation</title><style>body{font-family:Arial,sans-serif;line-height:1.6;margin:0 auto;max-width:800px;padding:20px;background-color:#f9f9f9;}h1,h2,h3,h4,h5,h6{color:#333;}code{background-color:#f0f0f0;padding:2px 4px;border-radius:4px;}pre{background-color:#f0f0f0;padding:10px;border-radius:4px;overflow-x:auto;}a{color:#0066cc;text-decoration:none;}a:hover{text-decoration:underline;}</style></head><body>' + marked(webpage) + '</body></html>'; fs.writeFileSync('index.html', html);"
          else
            echo "WEBPAGE.md not found, skipping index.html generation"
          fi
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
}

module.exports = { generateGitHubPagesWorkflow };
