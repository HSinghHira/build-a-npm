function generateGitHubPagesWorkflow(answers) {
  return `name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install

      - name: Generate HTML for GitHub Pages
        run: node node_modules/build-a-npm/lib/generateGitHubPagesIndex.js > index.html

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
          publish_branch: gh-pages
          keep_files: false
          force_orphan: true
          destination_dir: .
`;
}

module.exports = { generateGitHubPagesWorkflow };
