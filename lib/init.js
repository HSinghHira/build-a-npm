const { fs, path, logger, validateConfig, createGitHubRepo, simpleGit, retry } = require("./utils");
const { promptPackageDetails } = require("./promptPackageDetails");
const { execSync } = require("child_process");

async function init(args = {}) {
  const config = args.config || {};
  const answers = await promptPackageDetails(config);
  const projectDir = answers.useNewDir === "Yes, same as my Package Name" ? answers.name : answers.useNewDir === "Yes, a Custom Name" ? answers.projectDir : ".";
  const baseDir = process.cwd();
  const resolvedProjectDir = path.resolve(baseDir, projectDir);
  const packageJsonPath = path.join(resolvedProjectDir, "package.json");
  const gitignorePath = path.join(resolvedProjectDir, ".gitignore");
  const readmePath = path.join(resolvedProjectDir, "README.md");
  const srcDir = path.join(resolvedProjectDir, "src");
  const indexJsPath = path.join(srcDir, "index.js");
  const githubWorkflowDir = path.join(resolvedProjectDir, ".github", "workflows");
  const publishYmlPath = path.join(githubWorkflowDir, "publish.yml");
  const docsDir = path.join(resolvedProjectDir, answers.docsDir || "docs");
  const vitepressConfigPath = path.join(docsDir, ".vitepress", "config.mts");
  const vitepressThemePath = path.join(docsDir, ".vitepress", "theme", "index.ts");
  const docsIndexMdPath = path.join(docsDir, "index.md");
  const docsWorkflowPath = path.join(githubWorkflowDir, "deploy-docs.yml");

  logger.debug("Initializing project with answers:", answers);
  logger.debug("Base directory:", baseDir);
  logger.debug("Project directory:", resolvedProjectDir);
  logger.debug("Package.json path:", packageJsonPath);

  const validation = validateConfig(answers);
  if (!validation.valid) {
    logger.error("Configuration validation failed:", validation.errors);
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  if (answers.useNewDir !== "No") {
    if (fs.existsSync(resolvedProjectDir)) {
      logger.error(`Directory ${resolvedProjectDir} already exists`);
      throw new Error(`Directory ${resolvedProjectDir} already exists`);
    }
    fs.mkdirSync(resolvedProjectDir, { recursive: true });
    logger.info(`Created directory: ${resolvedProjectDir}`);
  }

  process.chdir(resolvedProjectDir);
  logger.info(`Switched to directory: ${resolvedProjectDir}`);

  const packageJson = {
    name: answers.name,
    version: answers.version,
    description: answers.description || "",
    main: answers.moduleType === "ES Modules" ? "src/index.js" : "src/index.js",
    type: answers.moduleType === "ES Modules" ? "module" : undefined,
    scripts: {
      start: "node src/index.js",
      ...(answers.testFramework !== "None" && { test: `${answers.testFramework.toLowerCase()} --watchAll` }),
      ...(answers.useESLint === "Yes" && { lint: "eslint src/" }),
      ...(answers.usePrettier === "Yes" && { format: "prettier --write src/" }),
      ...(answers.useVitePress === "Yes" && {
        "docs:dev": `vitepress dev ${answers.docsDir || "docs"}`,
        "docs:build": `vitepress build ${answers.docsDir || "docs"}`,
        "docs:preview": `vitepress preview ${answers.docsDir || "docs"}`,
      }),
      ...answers.customScripts,
    },
    keywords: answers.keywords || [],
    author: {
      name: answers.authorName,
      email: answers.authorEmail || undefined,
      url: answers.authorUrl,
    },
    homepage: answers.homepage,
    license: answers.license,
    dependencies: answers.dependencies,
    devDependencies: {
      ...(answers.useTypeScript === "Yes" && {
        typescript: "^5.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0",
        "ts-node": "latest",
        "@types/node": "latest",
      }),
      ...(answers.useESLint === "Yes" && { eslint: "^8.0.0" }),
      ...(answers.usePrettier === "Yes" && { prettier: "^3.0.0" }),
      ...(answers.testFramework === "Jest" && { jest: "latest", "@types/jest": "latest" }),
      ...(answers.testFramework === "Mocha" && { mocha: "latest", chai: "latest", "@types/chai": "latest" }),
      ...(answers.testFramework === "Vitest" && { vitest: "latest" }),
      ...(answers.useVitePress === "Yes" && { vitepress: "^1.0.0" }),
      ...answers.devDependencies,
    },
    publishConfig: {
      access: answers.access,
      registry: answers.publishTo === "GitHub Packages" ? "https://npm.pkg.github.com" : "https://registry.npmjs.org/",
    },
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  logger.info(`Created ${packageJsonPath}`);

  const gitignoreContent = `
node_modules/
dist/
${answers.useVitePress === "Yes" ? `${answers.docsDir || "docs"}/.vitepress/dist/\n${answers.docsDir || "docs"}/.vitepress/cache/` : ""}
coverage/
*.log
.env
`;
  fs.writeFileSync(gitignorePath, gitignoreContent.trim());
  logger.info(`Created ${gitignorePath}`);

  const readmeContent = `# ${answers.name}

${answers.description || "A Node.js package."}

## Installation
\`\`\`bash
npm install ${answers.name}
\`\`\`

## Usage
\`\`\`javascript
${answers.moduleType === "ES Modules" ? `import myPackage from '${answers.name}';` : `const myPackage = require('${answers.name}');`}
// Your code here
\`\`\`

${answers.useVitePress === "Yes" ? `## Documentation
Visit the [documentation](https://${answers.githubUsername}.github.io/${answers.githubRepoName || answers.name}/) for detailed usage instructions.` : ""}

## License
${answers.license}
`;
  fs.writeFileSync(readmePath, readmeContent);
  logger.info(`Created ${readmePath}`);

  fs.mkdirSync(srcDir, { recursive: true });
  const indexJsContent = answers.moduleType === "ES Modules"
    ? `export default function hello() {
  return "Hello from ${answers.name}!";
}
`
    : `module.exports = function hello() {
  return "Hello from ${answers.name}!";
};
`;
  fs.writeFileSync(indexJsPath, indexJsContent);
  logger.info(`Created ${indexJsPath}`);

  if (answers.createGitHubWorkflow === "Yes" && ["GitHub Packages", "Both"].includes(answers.publishTo)) {
    fs.mkdirSync(githubWorkflowDir, { recursive: true });
    const publishYmlContent = `
name: Publish Package
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  packages: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          registry-url: ${answers.publishTo === "GitHub Packages" ? "'https://npm.pkg.github.com'" : "'https://registry.npmjs.org'"}
      - run: npm install
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
    fs.writeFileSync(publishYmlPath, publishYmlContent.trim());
    logger.info(`Created ${publishYmlPath}`);
  }

  if (answers.useVitePress === "Yes") {
    fs.mkdirSync(docsDir, { recursive: true });
    fs.mkdirSync(path.join(docsDir, ".vitepress", "theme"), { recursive: true });

    const vitepressConfigContent = `
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
`;
    fs.writeFileSync(vitepressConfigPath, vitepressConfigContent.trim());
    logger.info(`Created ${vitepressConfigPath}`);

    const vitepressThemeContent = `
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default DefaultTheme
`;
    fs.writeFileSync(vitepressThemePath, vitepressThemeContent.trim());
    logger.info(`Created ${vitepressThemePath}`);

    const vitepressCustomCssPath = path.join(docsDir, ".vitepress", "theme", "custom.css");
    fs.writeFileSync(vitepressCustomCssPath, "/* Add custom styles here */\n");
    logger.info(`Created ${vitepressCustomCssPath}`);

    const docsIndexMdPath = path.join(docsDir, "index.md");
    const docsIndexMdContent = `
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
`;
    fs.writeFileSync(docsIndexMdPath, docsIndexMdContent.trim());
    logger.info(`Created ${docsIndexMdPath}`);

    const docsGuideMdPath = path.join(docsDir, "guide.md");
    const docsGuideMdContent = `
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
`;
    fs.writeFileSync(docsGuideMdPath, docsGuideMdContent.trim());
    logger.info(`Created ${docsGuideMdPath}`);

    if (answers.createGitHubRepo === "Yes") {
      fs.mkdirSync(githubWorkflowDir, { recursive: true });
      const docsWorkflowContent = `
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
        run: npm install
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
`;
      fs.writeFileSync(docsWorkflowPath, docsWorkflowContent.trim());
      logger.info(`Created ${docsWorkflowPath}`);
    }
  }

  const git = simpleGit();
  await retry(async () => {
    await git.init();
    await git.add(".");
    await git.commit("Initial commit");
    logger.info("Initialized git repository and made initial commit");
  }, { retries: 3, onError: (err) => logger.warn(`Git operation failed: ${err.message}`) });

  if (answers.createGitHubRepo === "Yes" && answers.githubToken && answers.githubToken.toLowerCase() !== "na") {
    await retry(async () => {
      await createGitHubRepo(answers.githubUsername, answers.githubRepoName || answers.name, answers.githubToken, answers.access);
      const repoUrl = `https://github.com/${answers.githubUsername}/${answers.githubRepoName || answers.name}.git`;
      await git.addRemote("origin", repoUrl);
      await git.push("origin", "main");
      if (answers.useVitePress === "Yes") {
        await git.branch(["gh-pages"]);
        await git.push("origin", "gh-pages");
      }
      logger.info(`Pushed to GitHub repository: ${repoUrl}`);
    }, { retries: 3, onError: (err) => logger.warn(`GitHub operation failed: ${err.message}`) });
  }

  try {
    execSync("npm install", { stdio: "inherit" });
    logger.info("Installed project dependencies");
  } catch (err) {
    logger.error(`Failed to install dependencies: ${err.message}`);
    throw new Error(`Failed to install dependencies: ${err.message}`);
  }

  if (answers.useTypeScript === "Yes") {
    try {
      execSync("npx tsc --init", { stdio: "inherit" });
      logger.info("Initialized TypeScript configuration");
    } catch (err) {
      logger.warn(`Failed to initialize TypeScript: ${err.message}`);
    }
  }

  if (answers.useESLint === "Yes") {
    try {
      execSync("npx eslint --init", { stdio: "inherit" });
      logger.info("Initialized ESLint configuration");
    } catch (err) {
      logger.warn(`Failed to initialize ESLint: ${err.message}`);
    }
  }

  if (answers.usePrettier === "Yes") {
    const prettierConfigPath = path.join(resolvedProjectDir, ".prettierrc");
    const prettierConfig = {
      semi: true,
      trailingComma: "es5",
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
    };
    fs.writeFileSync(prettierConfigPath, JSON.stringify(prettierConfig, null, 2));
    logger.info(`Created ${prettierConfigPath}`);
  }

  logger.info(`Project initialized successfully in ${resolvedProjectDir}`);
  if (answers.useVitePress === "Yes") {
    logger.info(`VitePress documentation set up in ${docsDir}. Run 'npm run docs:dev' to start the dev server.`);
    if (answers.createGitHubRepo === "Yes") {
      logger.info(`Documentation will be deployed to https://${answers.githubUsername}.github.io/${answers.githubRepoName || answers.name}/ on push to main branch.`);
    }
  }
}

module.exports = { init };