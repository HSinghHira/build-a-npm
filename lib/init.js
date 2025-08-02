const { execSync } = require("child_process");
const {
  colorize,
  getInquirer,
  fs,
  path,
  mergeConfigWithDefaults,
  logger,
  validateConfig,
  createGitHubRepo,
  retry,
} = require("./utils");
const { promptPackageDetails } = require("./promptPackageDetails");
const { generateSampleAnswers } = require("./generateSampleAnswers");
const { generatePackageJson } = require("./generatePackageJson");
const { generateNpmrc } = require("./generateNpmrc");
const { generateReadme } = require("./generateReadme");
const { generateLicense } = require("./generateLicense");
const { generateGitignore } = require("./generateGitignore");
const { generateGitHubWorkflow } = require("./generateGitHubWorkflow");
const { generateGitLabWorkflow } = require("./generateGitLabWorkflow");
const { generateCircleCIWorkflow } = require("./generateCircleCIWorkflow");
const { generateIndexFile } = require("./generateIndexFile");
const { generateTsConfig } = require("./generateTsConfig");
const { generateEslintConfig } = require("./generateEslintConfig");
const { generatePrettierConfig } = require("./generatePrettierConfig");
const { generateTestFile } = require("./generateTestFile");
const { generateNpmIgnore } = require("./generateNpmIgnore");

async function init(
  noGit,
  useSample,
  packageVersion,
  verbose,
  configPath,
  dryRun
) {
  logger.setVerbose(verbose);
  logger.info(
    `Starting init process (version: ${packageVersion}, dryRun: ${dryRun})`
  );

  try {
    const isWindows = process.platform === "win32";
    logger.debug(`Current directory: ${process.cwd()}`);
    console.log(
      colorize(
        `🚀 Welcome to build-a-npm v${packageVersion}! Let's create your Node package.`,
        "36"
      ) + "\n"
    );

    // Load and validate config file if provided
    let config = {};
    if (configPath) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const validation = validateConfig(config);
        if (!validation.valid) {
          logger.error(`Invalid config file: ${validation.errors.join(", ")}`);
          console.error(
            colorize(
              `❌ Invalid config file: ${validation.errors.join(", ")}`,
              "31"
            )
          );
          process.exit(1);
        }
        logger.debug(`Loaded config from ${configPath}:`, config);
      } catch (err) {
        logger.error(`Failed to load config file: ${err.message}`);
        console.error(
          colorize(`❌ Failed to load config file: ${err.message}`, "31")
        );
        process.exit(1);
      }
    }

    // Save state for recovery
    const stateFile = ".build-a-npm-state.json";
    const saveState = (answers) => {
      if (!dryRun) {
        fs.writeFileSync(stateFile, JSON.stringify(answers, null, 2));
        logger.debug(`Saved state to ${stateFile}`);
      }
    };

    // Check if package.json already exists
    if (fs.existsSync("package.json")) {
      const inquirer = await getInquirer();
      const { overwrite } = await inquirer.prompt([
        {
          type: "list",
          name: "overwrite",
          message: "package.json already exists. Do you want to overwrite it?",
          choices: ["Yes", "No"],
          default: "No",
        },
      ]);

      if (overwrite === "No") {
        logger.info("Cancelled by user. No files modified.");
        console.log(colorize("⏹️  Cancelled. No files were modified.", "33"));
        return;
      }
    }

    // Use sample data, config file, or prompt for details
    const defaultAnswers = useSample ? generateSampleAnswers() : {};
    const answers = useSample
      ? defaultAnswers
      : await promptPackageDetails(
          mergeConfigWithDefaults(config, defaultAnswers)
        );
    saveState(answers);

    logger.debug("Answers:", answers);
    const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);

    // Change to new directory if specified
    let packageDir = process.cwd();
    if (answers.useMonorepo === "Yes") {
      packageDir = path.join(answers.monorepoRoot, "packages", answers.name);
      logger.debug(`Creating monorepo package directory: ${packageDir}`);
      if (!dryRun) {
        fs.mkdirSync(packageDir, { recursive: true });
      }
    } else if (answers.useNewDir === "Yes, same as my Package Name") {
      packageDir = answers.name;
      if (fs.existsSync(packageDir)) {
        logger.error(`Directory ${packageDir} already exists`);
        console.error(
          colorize(`❌ Directory ${packageDir} already exists.`, "31")
        );
        process.exit(1);
      }
      if (!dryRun) {
        fs.mkdirSync(packageDir);
      }
    } else if (answers.useNewDir === "Yes, a Custom Name") {
      packageDir = answers.projectDir;
      if (fs.existsSync(packageDir)) {
        logger.error(`Directory ${packageDir} already exists`);
        console.error(
          colorize(`❌ Directory ${packageDir} already exists.`, "31")
        );
        process.exit(1);
      }
      if (!dryRun) {
        fs.mkdirSync(packageDir);
      }
    }
    if (!dryRun) {
      process.chdir(packageDir);
    }
    logger.debug(`Changed to directory: ${process.cwd()}`);

    // File generation with dry-run support
    const writeFile = (filePath, content, description) => {
      if (dryRun) {
        logger.info(`Dry run: Would write ${filePath}`);
        console.log(colorize(`[Dry Run] Would generate ${filePath}`, "33"));
        logger.debug(`${filePath} content:`, content);
        return;
      }
      fs.writeFileSync(filePath, content);
      logger.info(`Generated ${filePath}`);
      console.log(colorize(`✅ ${description}`, "32"));
    };

    // Create GitHub repository if selected
    if (
      isGitHub &&
      answers.createGitHubRepo === "Yes" &&
      answers.githubToken.toLowerCase() !== "na"
    ) {
      logger.info("Creating GitHub repository");
      if (!dryRun) {
        await retry(
          async () => {
            await createGitHubRepo(
              answers.githubUsername,
              answers.githubRepoName,
              answers.githubToken,
              answers.access
            );
          },
          {
            retries: 3,
            onError: (err) =>
              logger.warn(
                `GitHub repo creation attempt failed: ${err.message}`
              ),
          }
        );
      }
      console.log(colorize("✅ Created GitHub repository", "32"));
    }

    // Generate package.json
    const packageJsonContent = generatePackageJson(answers);
    writeFile("package.json", packageJsonContent, "Generated package.json");

    // Create node_modules/build-a-npm directory and copy publish.js
    const publishDir = path.join("node_modules", "build-a-npm");
    if (!dryRun) {
      fs.mkdirSync(publishDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, "..", "publish.js"),
        path.join(publishDir, "publish.js")
      );
    }
    logger.debug(`Copied publish.js to ${publishDir}`);
    console.log(
      colorize("✅ Copied publish.js to node_modules/build-a-npm", "32")
    );

    // Generate .npmrc if GitHub or Both selected and token not skipped
    if (isGitHub && answers.githubToken.toLowerCase() !== "na") {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken
      );
      writeFile(".npmrc", npmrcContent, "Generated .npmrc");
    }

    // Generate README.md
    const readmeContent = generateReadme(answers);
    writeFile("README.md", readmeContent, "Generated README.md");

    // Generate LICENSE if applicable
    const licenseContent = generateLicense(answers.license, answers.authorName);
    if (licenseContent) {
      writeFile("LICENSE", licenseContent, "Generated LICENSE");
    }

    // Generate main index.js or index.ts file if it doesn't exist
    const indexPath =
      answers.useTypeScript === "Yes" ? "src/index.ts" : "index.js";
    if (!fs.existsSync(indexPath) || dryRun) {
      const indexContent = generateIndexFile(
        answers.useTypeScript === "Yes",
        answers.moduleType === "ES Modules"
      );
      if (answers.useTypeScript === "Yes" && !dryRun) {
        fs.mkdirSync("src", { recursive: true });
        logger.debug("Created src directory");
      }
      writeFile(indexPath, indexContent, `Generated ${indexPath}`);
    }

    // Generate test file if testing framework selected
    if (answers.testFramework !== "None") {
      const testPath =
        answers.useTypeScript === "Yes"
          ? "test/index.test.ts"
          : "test/index.test.js";
      if (!fs.existsSync(testPath) || dryRun) {
        const testContent = generateTestFile(
          answers.testFramework,
          answers.useTypeScript === "Yes",
          answers.moduleType === "ES Modules"
        );
        if (!dryRun) {
          fs.mkdirSync("test", { recursive: true });
          logger.debug("Created test directory");
        }
        writeFile(testPath, testContent, `Generated ${testPath}`);
      }
    }

    // Generate .npmignore
    const npmIgnoreContent = generateNpmIgnore(answers.useTypeScript === "Yes");
    writeFile(".npmignore", npmIgnoreContent, "Generated .npmignore");

    // Generate tsconfig.json if TypeScript is selected
    if (answers.useTypeScript === "Yes") {
      const tsConfigContent = generateTsConfig();
      writeFile("tsconfig.json", tsConfigContent, "Generated tsconfig.json");
    }

    // Generate .eslintrc.json if ESLint is selected
    if (answers.useESLint === "Yes") {
      const eslintConfigContent = generateEslintConfig(
        answers.useTypeScript === "Yes"
      );
      writeFile(
        ".eslintrc.json",
        eslintConfigContent,
        "Generated .eslintrc.json"
      );
    }

    // Generate .prettierrc if Prettier is selected
    if (answers.usePrettier === "Yes") {
      const prettierConfigContent = generatePrettierConfig();
      writeFile(".prettierrc", prettierConfigContent, "Generated .prettierrc");
    }

    // Generate CI/CD workflow
    if (
      answers.ciProvider !== "None" &&
      answers.createGitHubWorkflow === "Yes"
    ) {
      const workflowDir =
        answers.ciProvider === "GitHub Actions"
          ? ".github/workflows"
          : answers.ciProvider === "GitLab CI"
          ? ""
          : ".circleci";
      const workflowFile =
        answers.ciProvider === "GitHub Actions"
          ? "publish.yml"
          : answers.ciProvider === "GitLab CI"
          ? ".gitlab-ci.yml"
          : "config.yml";
      const workflowPath = path.join(workflowDir, workflowFile);
      let workflowContent;
      if (answers.ciProvider === "GitHub Actions") {
        workflowContent = generateGitHubWorkflow(answers);
      } else if (answers.ciProvider === "GitLab CI") {
        workflowContent = generateGitLabWorkflow(answers);
      } else if (answers.ciProvider === "CircleCI") {
        workflowContent = generateCircleCIWorkflow(answers);
      }
      if (!dryRun) {
        fs.mkdirSync(workflowDir, { recursive: true });
      }
      writeFile(workflowPath, workflowContent, `Generated ${workflowPath}`);
    }

    // Initialize git repository if not exists and --no-git flag is not set
    if (!noGit && !fs.existsSync(".git") && isGitHub) {
      try {
        await retry(
          () => {
            execSync("git init", { stdio: verbose ? "inherit" : "ignore" });
          },
          {
            retries: 3,
            onError: (err) =>
              logger.warn(`Git init attempt failed: ${err.message}`),
          }
        );
        logger.info("Initialized git repository");
        console.log(colorize("✅ Initialized git repository", "32"));
      } catch (err) {
        logger.warn(`Could not initialize git repository: ${err.message}`);
        console.log(
          colorize(
            `⚠️ Could not initialize git repository: ${err.message}`,
            "33"
          )
        );
        console.log(
          colorize(
            "💡 Run `git init` manually to initialize the repository.",
            "33"
          )
        );
      }
    }

    // Create .gitignore if it doesn't exist
    if (!fs.existsSync(".gitignore") || dryRun) {
      const gitignoreContent = generateGitignore(
        answers.useTypeScript === "Yes"
      );
      writeFile(".gitignore", gitignoreContent, "Generated .gitignore");
    }

    // Generate root package.json for monorepo if needed
    if (answers.useMonorepo === "Yes") {
      const rootDir = path.resolve(answers.monorepoRoot);
      if (!dryRun) {
        process.chdir(rootDir);
      }
      logger.debug(`Changed to root directory: ${process.cwd()}`);
      if (!fs.existsSync("package.json") || dryRun) {
        const rootPackageJson = {
          name: "monorepo-root",
          private: true,
          workspaces:
            answers.packageManager === "yarn"
              ? ["packages/*"]
              : { packages: ["packages/*"] },
        };
        const rootPackageJsonContent = JSON.stringify(rootPackageJson, null, 2);
        writeFile(
          "package.json",
          rootPackageJsonContent,
          "Generated root package.json for monorepo"
        );
      }
    }

    if (!dryRun && fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
      logger.debug(`Removed state file ${stateFile}`);
    }

    console.log("\n" + colorize("🎉 Package setup complete!", "1;36"));
    console.log("\n" + colorize("📋 Next steps:", "1;36"));
    if (isGitHub) {
      if (answers.githubToken.toLowerCase() === "na") {
        console.log(
          colorize(
            "1. Set your GITHUB_TOKEN environment variable for GitHub Packages",
            "36"
          )
        );
        console.log(
          colorize(
            "   - Create a token at https://github.com/settings/tokens with 'write:packages' scope",
            "33"
          )
        );
      } else {
        console.log(
          colorize(
            "1. Verify your GITHUB_TOKEN in .npmrc has the 'write:packages' scope",
            "36"
          )
        );
      }
      if (answers.createGitHubWorkflow === "Yes") {
        console.log(
          colorize(
            `2. Configure ${answers.ciProvider} secrets (NPM_TOKEN and/or GITHUB_TOKEN)`,
            "36"
          )
        );
      }
    }
    console.log(colorize("3. Run `npm install` to install dependencies", "36"));
    if (isWindows) {
      console.log(
        colorize(
          "   - On Windows, run commands in an Administrator Command Prompt to avoid permissions errors",
          "33"
        )
      );
    } else {
      console.log(
        colorize(
          "   - Ensure you have write permissions for the project directory",
          "33"
        )
      );
    }
    console.log(
      colorize(
        `4. Add your package code to ${
          answers.useTypeScript === "Yes" ? "src/index.ts" : "index.js"
        }`,
        "36"
      )
    );
    console.log(
      colorize(`5. Run \`npm run publish\` to publish your package`, "36")
    );
    console.log("\n" + colorize("💡 The publish script will:", "1;36"));
    console.log(
      colorize(
        "   - Prompt for version bump type (patch, minor, or major) if not specified",
        "36"
      )
    );
    console.log(
      colorize(
        `   - Publish to ${
          answers.publishTo === "Both"
            ? "both npmjs.org and GitHub Packages"
            : answers.publishTo
        }`,
        "36"
      )
    );
    if (isGitHub) {
      console.log(
        colorize("   - Commit and push changes to your repository", "36")
      );
    }
  } catch (err) {
    logger.error(`Error in init: ${err.message}`, err.stack);
    console.error(colorize("❌ Error:", "31"), err.message);
    console.error(
      colorize(
        "💡 Check your file permissions, network connection, or try running with --dry-run.",
        "33"
      )
    );
    process.exit(1);
  }
}

module.exports = { init };
