const { fs, path, logger, validateConfig, createGitHubRepo, simpleGit, retry } = require("./utils");
const { promptPackageDetails } = require("./promptPackageDetails");
const { generatePackageJson } = require("./generatePackageJson");
const { generateGitHubWorkflow } = require("./generateGitHubWorkflow");
const { generateVitePressFiles } = require("./generateVitePress");
const { execSync } = require("child_process");
const packageJson = require("../package.json");

async function init(args = {}) {
  logger.info(`🚀 Welcome to build-a-npm v${packageJson.version}! Let's create your Node package.`);
  
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

  logger.debug("Generating package.json");
  const packageJsonContent = generatePackageJson(answers);
  fs.writeFileSync(packageJsonPath, packageJsonContent);
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
    const githubWorkflowDir = path.join(resolvedProjectDir, ".github", "workflows");
    const publishYmlPath = path.join(githubWorkflowDir, "publish.yml");
    fs.mkdirSync(githubWorkflowDir, { recursive: true });
    const publishYmlContent = generateGitHubWorkflow(answers);
    fs.writeFileSync(publishYmlPath, publishYmlContent.trim());
    logger.info(`Created ${publishYmlPath}`);
  }

  if (answers.useVitePress === "Yes") {
    const vitePressFiles = generateVitePressFiles(answers, resolvedProjectDir);
    vitePressFiles.forEach(({ path: filePath, content }) => {
      fs.writeFileSync(filePath, content.trim());
      logger.info(`Created ${filePath}`);
    });
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

  logger.debug("Before npm install, package.json:", fs.readFileSync(packageJsonPath, "utf8"));
  try {
    execSync("npm ci", { stdio: "inherit" });
    logger.info("Installed project dependencies using npm ci");
  } catch (err) {
    logger.error(`Failed to install dependencies: ${err.message}`);
    throw new Error(`Failed to install dependencies: ${err.message}`);
  }
  logger.debug("After npm install, package.json:", fs.readFileSync(packageJsonPath, "utf8"));

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
    logger.info(`VitePress documentation set up in ${answers.docsDir || "docs"}. Run 'npm run docs:dev' to start the dev server.`);
    if (answers.createGitHubRepo === "Yes") {
      logger.info(`Documentation will be deployed to https://${answers.githubUsername}.github.io/${answers.githubRepoName || answers.name}/ on push to main branch.`);
    }
  }
}

module.exports = { init };