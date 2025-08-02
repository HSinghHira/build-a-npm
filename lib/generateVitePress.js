const { path } = require("./utils");

function generateVitePressFiles(answers, projectDir) {
  const docsDir = path.join(projectDir, answers.docsDir || "docs");
  const vitepressConfigPath = path.join(docsDir, ".vitepress", "config.mts");
  const vitepressThemePath = path.join(docsDir, ".vitepress", "theme", "index.ts");
  const vitepressCustomCssPath = path.join(docsDir, ".vitepress", "theme", "custom.css");
  const docsIndexMdPath = path.join(docsDir, "index.md");
  const docsGuideMdPath = path.join(docsDir, "guide.md");
  const githubWorkflowDir = path.join(projectDir, ".github", "workflows");
  const docsWorkflowPath = path.join(githubWorkflowDir, "deploy-docs.yml");

  const files = [
    {
      path: vitepressConfigPath,
      content: `
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "${answers.name} Documentation",
  description: "${answers.description || "Documentation for " + answers.name}",
  base: "${answers.basePath || "/"}",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide' }
        ]
      }
    ],
    editLink: {
      pattern: 'https://github.com/${answers.githubUsername}/${answers.githubRepoName || answers.name}/edit/main/${answers.docsDir || "docs"}/:path',
      text: 'Edit this page on GitHub'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/${answers.githubUsername}/${answers.githubRepoName || answers.name}' }
    ]
  }
})
`,
    },
    {
      path: vitepressThemePath,
      content: `
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default DefaultTheme
`,
    },
    {
      path: vitepressCustomCssPath,
      content: `/* Add custom styles here */\n`,
    },
    {
      path: docsIndexMdPath,
      content: `
---
layout: home

hero:
  name: "${answers.name}"
  text: Welcome to ${answers.name} Documentation
  tagline: ${answers.description || "A Node.js package with comprehensive documentation"}
  actions:
    - theme: brand
      text: Get Started
      link: /guide
    - theme: alt
      text: View on GitHub
      link: https://github.com/${answers.githubUsername}/${answers.githubRepoName || answers.name}

features:
  - title: Easy to Use
    details: Get started quickly with ${answers.name}.
    icon: 🚀
  - title: Well Documented
    details: Comprehensive documentation for all features.
    icon: 📚
  - title: Open Source
    details: Contribute to the project on GitHub.
    icon: 🌐
---

# Welcome to ${answers.name}

This is the official documentation for ${answers.name}. Explore the guide to learn how to use the package effectively.
`,
    },
    {
      path: docsGuideMdPath,
      content: `
# Getting Started

## Installation

\`\`\`bash
npm install ${answers.name}
\`\`\`

## Usage

\`\`\`javascript
${answers.moduleType === "ES Modules" ? `import myPackage from '${answers.name}';` : `const myPackage = require('${answers.name}');`}
console.log(myPackage.hello());
\`\`\`

Explore more features in the sidebar navigation.
`,
    },
  ];

  if (answers.createGitHubRepo === "Yes") {
    files.push({
      path: docsWorkflowPath,
      content: `
name: Deploy VitePress to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build VitePress
        run: npm run docs:build
      - name: Setup Pages
        uses: actions/configure-pages@v3
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./${answers.docsDir || "docs"}/.vitepress/dist
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
`,
    });
  }

  return files;
}

module.exports = { generateVitePressFiles };