const { execSync } = require("child_process");
const {
  colorize,
  getInquirer,
  fs,
  path,
  mergeConfigWithDefaults,
} = require("./utils");
const { promptPackageDetails } = require("./promptPackageDetails");
const { generateSampleAnswers } = require("./generateSampleAnswers");
const { generatePackageJson } = require("./generatePackageJson");
const { generateNpmrc } = require("./generateNpmrc");
const { generateReadme } = require("./generateReadme");
const { generateLicense } = require("./generateLicense");
const { generateGitignore } = require("./generateGitignore");
const { generateGitHubWorkflow } = require("./generateGitHubWorkflow");
const { generateIndexFile } = require("./generateIndexFile");
const { generateTsConfig } = require("./generateTsConfig");
const { generateEslintConfig } = require("./generateEslintConfig");
const { generatePrettierConfig } = require("./generatePrettierConfig");

async function init(noGit, useSample, packageVersion, verbose, configPath) {
  try {
    const isWindows = process.platform === "win32";
    if (verbose) {
      console.log(colorize(`📋 Running in verbose mode`, "36"));
      console.log(colorize(`📍 Current directory: ${process.cwd()}`, "36"));
    }
    console.log(
      colorize(
        `🚀 Welcome to build-a-npm v${packageVersion}! Let's create your Node package.`,
        "36"
      ) + "\n"
    );

    // Load config file if provided
    let config = {};
    if (configPath) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (verbose) {
          console.log(colorize(`📄 Loaded config from ${configPath}`, "36"));
          console.log(colorize(JSON.stringify(config, null, 2), "36"));
        }
      } catch (err) {
        console.error(
          colorize(`❌ Failed to load config file: ${err.message}`, "31")
        );
        process.exit(1);
      }
    }

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

    if (verbose) {
      console.log(
        colorize(`📋 Answers: ${JSON.stringify(answers, null, 2)}`, "36")
      );
    }

    // Change to new directory if specified
    let packageDir = process.cwd();
    if (answers.useMonorepo === "Yes") {
      packageDir = path.join("packages", answers.name);
      if (verbose) {
        console.log(
          colorize(
            `📁 Creating monorepo package directory: ${packageDir}`,
            "36"
          )
        );
      }
      fs.mkdirSync(packageDir, { recursive: true });
    } else if (answers.useNewDir === "Yes, same as my Package Name") {
      packageDir = answers.name;
      if (fs.existsSync(packageDir)) {
        console.error(
          colorize(`❌ Directory ${packageDir} already exists.`, "31")
        );
        process.exit(1);
      }
      fs.mkdirSync(packageDir);
    } else if (answers.useNewDir === "Yes, a Custom Name") {
      packageDir = answers.projectDir;
      if (fs.existsSync(packageDir)) {
        console.error(
          colorize(`❌ Directory ${packageDir} already exists.`, "31")
        );
        process.exit(1);
      }
      fs.mkdirSync(packageDir);
    }
    process.chdir(packageDir);
    if (verbose) {
      console.log(colorize(`📍 Changed to directory: ${process.cwd()}`, "36"));
    }

    // Generate package.json
    const packageJsonContent = generatePackageJson(answers);
    if (verbose) {
      console.log(colorize(`📄 package.json content:`, "36"));
      console.log(packageJsonContent);
    }
    fs.writeFileSync("package.json", packageJsonContent);
    console.log(colorize("✅ Generated package.json", "32"));

    // Create node_modules/build-a-npm directory and copy publish.js
    const publishDir = path.join("node_modules", "build-a-npm");
    fs.mkdirSync(publishDir, { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, "..", "publish.js"),
      path.join(publishDir, "publish.js")
    );
    if (verbose) {
      console.log(colorize(`📄 Copied publish.js to ${publishDir}`, "36"));
    }
    console.log(
      colorize("✅ Copied publish.js to node_modules/build-a-npm", "32")
    );

    // Generate .npmrc if GitHub or Both selected and token not skipped
    const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
    if (isGitHub && answers.githubToken.toLowerCase() !== "na") {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken
      );
      if (verbose) {
        console.log(colorize(`📄 .npmrc content:`, "36"));
        console.log(npmrcContent);
      }
      fs.writeFileSync(".npmrc", npmrcContent);
      console.log(colorize("✅ Generated .npmrc", "32"));
    }

    // Generate README.md
    const readmeContent = generateReadme(answers);
    if (verbose) {
      console.log(colorize(`📄 README.md content:`, "36"));
      console.log(readmeContent);
    }
    fs.writeFileSync("README.md", readmeContent);
    console.log(colorize("✅ Generated README.md", "32"));

    // Generate LICENSE if applicable
    const licenseContent = generateLicense(answers.license, answers.authorName);
    if (licenseContent) {
      if (verbose) {
        console.log(colorize(`📄 LICENSE content:`, "36"));
        console.log(licenseContent);
      }
      fs.writeFileSync("LICENSE", licenseContent);
      console.log(colorize("✅ Generated LICENSE", "32"));
    }

    // Generate main index.js or index.ts file if it doesn't exist
    if (
      !fs.existsSync(
        answers.useTypeScript === "Yes" ? "src/index.ts" : "index.js"
      )
    ) {
      const indexContent = generateIndexFile(answers.useTypeScript === "Yes");
      if (answers.useTypeScript === "Yes") {
        fs.mkdirSync("src", { recursive: true });
        if (verbose) {
          console.log(colorize(`📁 Created src directory`, "36"));
        }
      }
      const indexPath =
        answers.useTypeScript === "Yes" ? "src/index.ts" : "index.js";
      if (verbose) {
        console.log(colorize(`📄 ${indexPath} content:`, "36"));
        console.log(indexContent);
      }
      fs.writeFileSync(indexPath, indexContent);
      console.log(colorize(`✅ Generated ${indexPath}`, "32"));
    }

    // Generate tsconfig.json if TypeScript is selected
    if (answers.useTypeScript === "Yes") {
      const tsConfigContent = generateTsConfig();
      if (verbose) {
        console.log(colorize(`📄 tsconfig.json content:`, "36"));
        console.log(tsConfigContent);
      }
      fs.writeFileSync("tsconfig.json", tsConfigContent);
      console.log(colorize("✅ Generated tsconfig.json", "32"));
    }

    // Generate .eslintrc.json if ESLint is selected
    if (answers.useESLint === "Yes") {
      const eslintConfigContent = generateEslintConfig(
        answers.useTypeScript === "Yes"
      );
      if (verbose) {
        console.log(colorize(`📄 .eslintrc.json content:`, "36"));
        console.log(eslintConfigContent);
      }
      fs.writeFileSync(".eslintrc.json", eslintConfigContent);
      console.log(colorize("✅ Generated .eslintrc.json", "32"));
    }

    // Generate .prettierrc if Prettier is selected
    if (answers.usePrettier === "Yes") {
      const prettierConfigContent = generatePrettierConfig();
      if (verbose) {
        console.log(colorize(`📄 .prettierrc content:`, "36"));
        console.log(prettierConfigContent);
      }
      fs.writeFileSync(".prettierrc", prettierConfigContent);
      console.log(colorize("✅ Generated .prettierrc", "32"));
    }

    // Generate GitHub Actions workflow if GitHub or Both selected and createGitHubWorkflow is true
    if (isGitHub && answers.createGitHubWorkflow === "Yes") {
      const workflowDir = path.join(".github", "workflows");
      fs.mkdirSync(workflowDir, { recursive: true });
      const workflowContent = generateGitHubWorkflow(answers);
      if (verbose) {
        console.log(
          colorize(`📄 .github/workflows/publish.yml content:`, "36")
        );
        console.log(workflowContent);
      }
      fs.writeFileSync(path.join(workflowDir, "publish.yml"), workflowContent);
      console.log(colorize("✅ Generated .github/workflows/publish.yml", "32"));
    }

    // Initialize git repository if not exists and --no-git flag is not set
    if (!noGit && !fs.existsSync(".git") && isGitHub) {
      try {
        execSync("git init", { stdio: verbose ? "inherit" : "ignore" });
        if (verbose) {
          console.log(colorize(`📄 git init output:`, "36"));
          console.log("Initialized empty Git repository");
        }
        console.log(colorize("✅ Initialized git repository", "32"));
      } catch (err) {
        console.log(
          colorize(
            "⚠️  Could not initialize git repository: " + err.message,
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
    if (!fs.existsSync(".gitignore")) {
      const gitignoreContent = generateGitignore(
        answers.useTypeScript === "Yes"
      );
      if (verbose) {
        console.log(colorize(`📄 .gitignore content:`, "36"));
        console.log(gitignoreContent);
      }
      fs.writeFileSync(".gitignore", gitignoreContent);
      console.log(colorize("✅ Generated .gitignore", "32"));
    }

    // Generate root package.json for monorepo if needed
    if (answers.useMonorepo === "Yes") {
      process.chdir(path.join("..", ".."));
      if (verbose) {
        console.log(
          colorize(`📍 Changed to root directory: ${process.cwd()}`, "36")
        );
      }
      if (!fs.existsSync("package.json")) {
        const rootPackageJson = {
          name: "monorepo-root",
          private: true,
          workspaces: ["packages/*"],
        };
        const rootPackageJsonContent = JSON.stringify(rootPackageJson, null, 2);
        if (verbose) {
          console.log(colorize(`📄 Root package.json content:`, "36"));
          console.log(rootPackageJsonContent);
        }
        fs.writeFileSync("package.json", rootPackageJsonContent);
        console.log(
          colorize("✅ Generated root package.json for monorepo", "32")
        );
      }
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
            "2. Configure GitHub Actions secrets (NPM_TOKEN and/or GITHUB_TOKEN) at https://github.com/" +
              answers.githubUsername +
              "/" +
              answers.githubRepoName +
              "/settings/secrets/actions",
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
        "4. Add your package code to " +
          (answers.useTypeScript === "Yes" ? "src/index.ts" : "index.js"),
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
    console.error(colorize("❌ Error:", "31"), err.message);
    console.error(
      colorize(
        "💡 Check your file permissions, network connection, or try running the command again.",
        "33"
      )
    );
    process.exit(1);
  }
}

module.exports = { init };
