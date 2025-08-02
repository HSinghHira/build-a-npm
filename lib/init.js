const {
  fs,
  path,
  logger,
  validateConfig,
  createGitHubRepo,
  simpleGit,
  retry,
} = require("./utils");
const { promptPackageDetails } = require("./promptPackageDetails");
const { generatePackageJson } = require("./generatePackageJson");
const { generateGitHubWorkflow } = require("./generateGitHubWorkflow");
const { generateCircleCIWorkflow } = require("./generateCircleCIWorkflow");
const { generateGitLabWorkflow } = require("./generateGitLabWorkflow");
const { generateGitignore } = require("./generateGitignore");
const { generateReadme } = require("./generateReadme");
const { generateIndexFile } = require("./generateIndexFile");
const { generateLicense } = require("./generateLicense");
const { generateNpmIgnore } = require("./generateNpmIgnore");
const { generateNpmrc } = require("./generateNpmrc");
const { generateTsConfig } = require("./generateTsConfig");
const { generateEslintConfig } = require("./generateEslintConfig");
const { generatePrettierConfig } = require("./generatePrettierConfig");
const { generateTestFile } = require("./generateTestFile");
const { generateVitePressFiles } = require("./generateVitePress");
const { execSync } = require("child_process");
const packageJson = require("../package.json");

async function init(args = {}) {
  logger.info(
    `🚀 Welcome to build-a-npm v${packageJson.version}! Let's create your Node package.`
  );

  const config = args.config || {};
  const answers = await promptPackageDetails(config);
  const projectDir =
    answers.useNewDir === "Yes, same as my Package Name"
      ? answers.name
      : answers.useNewDir === "Yes, a Custom Name"
      ? answers.projectDir
      : ".";
  const baseDir = process.cwd();
  const resolvedProjectDir = path.resolve(baseDir, projectDir);
  const packageJsonPath = path.join(resolvedProjectDir, "package.json");
  const gitignorePath = path.join(resolvedProjectDir, ".gitignore");
  const npmignorePath = path.join(resolvedProjectDir, ".npmignore");
  const npmrcPath = path.join(resolvedProjectDir, ".npmrc");
  const readmePath = path.join(resolvedProjectDir, "README.md");
  const licensePath = path.join(resolvedProjectDir, "LICENSE");
  const srcDir = path.join(resolvedProjectDir, "src");
  const indexJsPath = path.join(srcDir, "index.js");
  const testFilePath = path.join(srcDir, "index.test.js");
  const tsconfigPath = path.join(resolvedProjectDir, "tsconfig.json");
  const eslintConfigPath = path.join(resolvedProjectDir, ".eslintrc.json");
  const prettierConfigPath = path.join(resolvedProjectDir, ".prettierrc");
  const publishJsPath = path.join(resolvedProjectDir, "publish.js");
  const configTemplatePath = path.join(
    resolvedProjectDir,
    "config.template.json"
  );
  const libDir = path.join(resolvedProjectDir, "lib");

  logger.debug("Initializing project with answers:", answers);
  logger.debug("Base directory:", baseDir);
  logger.debug("Project directory:", resolvedProjectDir);

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

  // Generate package.json
  logger.debug("Generating package.json");
  const packageJsonContent = generatePackageJson(answers);
  fs.writeFileSync(packageJsonPath, packageJsonContent);
  logger.info(`Created ${packageJsonPath}`);

  // Generate .gitignore
  const gitignoreContent = generateGitignore(answers);
  fs.writeFileSync(gitignorePath, gitignoreContent.trim());
  logger.info(`Created ${gitignorePath}`);

  // Generate .npmignore
  const npmignoreContent = generateNpmIgnore(answers);
  fs.writeFileSync(npmignorePath, npmignoreContent.trim());
  logger.info(`Created ${npmignorePath}`);

  // Generate .npmrc
  if (["GitHub Packages", "Both"].includes(answers.publishTo)) {
    const npmrcContent = generateNpmrc(answers);
    fs.writeFileSync(npmrcPath, npmrcContent.trim());
    logger.info(`Created ${npmrcPath}`);
  }

  // Generate README.md
  const readmeContent = generateReadme(answers);
  fs.writeFileSync(readmePath, readmeContent);
  logger.info(`Created ${readmePath}`);

  // Generate LICENSE
  const licenseContent = generateLicense(answers);
  fs.writeFileSync(licensePath, licenseContent);
  logger.info(`Created ${licensePath}`);

  // Create src directory and generate index.js
  fs.mkdirSync(srcDir, { recursive: true });
  const indexJsContent = generateIndexFile(answers);
  fs.writeFileSync(indexJsPath, indexJsContent);
  logger.info(`Created ${indexJsPath}`);

  // Generate test file
  if (answers.testFramework !== "None") {
    const testFileContent = generateTestFile(answers);
    fs.writeFileSync(testFilePath, testFileContent);
    logger.info(`Created ${testFilePath}`);
  }

  // Generate TypeScript config
  if (answers.useTypeScript === "Yes") {
    const tsconfigContent = generateTsConfig(answers);
    fs.writeFileSync(tsconfigPath, tsconfigContent);
    logger.info(`Created ${tsconfigPath}`);
  }

  // Generate ESLint config
  if (answers.useESLint === "Yes") {
    const eslintConfigContent = generateEslintConfig(answers);
    fs.writeFileSync(eslintConfigPath, eslintConfigContent);
    logger.info(`Created ${eslintConfigPath}`);
  }

  // Generate Prettier config
  if (answers.usePrettier === "Yes") {
    const prettierConfigContent = generatePrettierConfig(answers);
    fs.writeFileSync(prettierConfigPath, prettierConfigContent);
    logger.info(`Created ${prettierConfigPath}`);
  }

  // Generate VitePress files
  if (answers.useVitePress === "Yes") {
    const vitePressFiles = generateVitePressFiles(answers, resolvedProjectDir);
    vitePressFiles.forEach(({ path: filePath, content }) => {
      fs.writeFileSync(filePath, content.trim());
      logger.info(`Created ${filePath}`);
    });
  }

  // Generate CI/CD workflow
  if (
    answers.createGitHubWorkflow === "Yes" &&
    ["GitHub Packages", "Both"].includes(answers.publishTo)
  ) {
    const workflowDir = path.join(
      resolvedProjectDir,
      answers.ciProvider === "GitHub Actions"
        ? ".github/workflows"
        : answers.ciProvider === "CircleCI"
        ? ".circleci"
        : ".gitlab"
    );
    const workflowPath = path.join(
      workflowDir,
      answers.ciProvider === "GitHub Actions"
        ? "publish.yml"
        : answers.ciProvider === "CircleCI"
        ? "config.yml"
        : ".gitlab-ci.yml"
    );
    fs.mkdirSync(workflowDir, { recursive: true });
    const workflowContent =
      answers.ciProvider === "GitHub Actions"
        ? generateGitHubWorkflow(answers)
        : answers.ciProvider === "CircleCI"
        ? generateCircleCIWorkflow(answers)
        : generateGitLabWorkflow(answers);
    fs.writeFileSync(workflowPath, workflowContent.trim());
    logger.info(`Created ${workflowPath}`);
  }

  // Generate publish.js, lib/, and config.template.json for Node Package Builder
  if (answers.useNodePackageBuilder === "Yes") {
    const publishJsContent = `// Minimal publish.js for ${answers.name}\nconst { execSync } = require("child_process");\n\n// Placeholder for publishing logic\nconsole.log("Publishing ${answers.name}...");\n`;
    fs.writeFileSync(publishJsPath, publishJsContent);
    logger.info(`Created ${publishJsPath}`);

    fs.mkdirSync(libDir, { recursive: true });
    const libIndexPath = path.join(libDir, "index.js");
    fs.writeFileSync(
      libIndexPath,
      `// Placeholder for ${answers.name} library\nmodule.exports = {};\n`
    );
    logger.info(`Created ${libIndexPath}`);

    const configTemplateContent = JSON.stringify({}, null, 2);
    fs.writeFileSync(configTemplatePath, configTemplateContent);
    logger.info(`Created ${configTemplatePath}`);
  }

  // Initialize git repository
  const git = simpleGit();
  await retry(
    async () => {
      await git.init();
      await git.add(".");
      await git.commit("Initial commit");
      logger.info("Initialized git repository and made initial commit");
    },
    {
      retries: 3,
      onError: (err) => logger.warn(`Git operation failed: ${err.message}`),
    }
  );

  // Create and push to GitHub repository
  if (
    answers.createGitHubRepo === "Yes" &&
    answers.githubToken &&
    answers.githubToken.toLowerCase() !== "na"
  ) {
    await retry(
      async () => {
        await createGitHubRepo(
          answers.githubUsername,
          answers.githubRepoName || answers.name,
          answers.githubToken,
          answers.access
        );
        const repoUrl = `https://github.com/${answers.githubUsername}/${
          answers.githubRepoName || answers.name
        }.git`;
        await git.addRemote("origin", repoUrl);
        await git.push("origin", "main");
        if (answers.useVitePress === "Yes") {
          await git.branch(["gh-pages"]);
          await git.push("origin", "gh-pages");
        }
        logger.info(`Pushed to GitHub repository: ${repoUrl}`);
      },
      {
        retries: 3,
        onError: (err) =>
          logger.warn(`GitHub operation failed: ${err.message}`),
      }
    );
  }

  // Install dependencies
  logger.debug(
    "Before npm install, package.json:",
    fs.readFileSync(packageJsonPath, "utf8")
  );
  try {
    execSync("npm ci", { stdio: "inherit" });
    logger.info("Installed project dependencies using npm ci");
  } catch (err) {
    logger.error(`Failed to install dependencies: ${err.message}`);
    throw new Error(`Failed to install dependencies: ${err.message}`);
  }
  logger.debug(
    "After npm install, package.json:",
    fs.readFileSync(packageJsonPath, "utf8")
  );

  logger.info(`Project initialized successfully in ${resolvedProjectDir}`);
  if (answers.useVitePress === "Yes") {
    logger.info(
      `VitePress documentation set up in ${
        answers.docsDir || "docs"
      }. Run 'npm run docs:dev' to start the dev server.`
    );
    if (answers.createGitHubRepo === "Yes") {
      logger.info(
        `Documentation will be deployed to https://${
          answers.githubUsername
        }.github.io/${
          answers.githubRepoName || answers.name
        }/ on push to main branch.`
      );
    }
  }
  if (answers.useNodePackageBuilder === "Yes") {
    logger.info(
      `Node Package Builder settings included. Run 'npm run publish:patch' to publish to npmjs and GitHub Packages.`
    );
  }
}

module.exports = { init };
