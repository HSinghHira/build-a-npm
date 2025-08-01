const { execSync } = require("child_process");
const { colorize, getInquirer, fs, path } = require("./utils");
const { promptPackageDetails } = require("./promptPackageDetails");
const { generateSampleAnswers } = require("./generateSampleAnswers");
const { generatePackageJson } = require("./generatePackageJson");
const { generateNpmrc } = require("./generateNpmrc");
const { generateReadme } = require("./generateReadme");
const { generateLicense } = require("./generateLicense");
const { generateGitignore } = require("./generateGitignore");
const { generateGitHubWorkflow } = require("./generateGitHubWorkflow");
const { generateIndexFile } = require("./generateIndexFile");

async function init(noGit, useSample, packageVersion) {
  try {
    const isWindows = process.platform === "win32";
    console.log(
      colorize(
        `🚀 Welcome to build-a-npm v${packageVersion}! Let's create your Node package.`,
        "36"
      ) + "\n"
    );

    // Check if package.json already exists
    if (fs.existsSync("package.json")) {
      const inquirer = await getInquirer();
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: "package.json already exists. Do you want to overwrite it?",
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(colorize("⏹️  Cancelled. No files were modified.", "33"));
        return;
      }
    }

    // Use sample data or prompt for details
    const answers = useSample
      ? generateSampleAnswers()
      : await promptPackageDetails();

    // Change to new directory if specified
    if (answers.useNewDir === "Yes") {
      if (fs.existsSync(answers.projectDir)) {
        console.error(
          colorize(`❌ Directory ${answers.projectDir} already exists.`, "31")
        );
        process.exit(1);
      }
      fs.mkdirSync(answers.projectDir);
      process.chdir(answers.projectDir);
    }

    // Generate package.json
    const packageJsonContent = generatePackageJson(answers);
    fs.writeFileSync("package.json", packageJsonContent);
    console.log(colorize("✅ Generated package.json", "32"));

    // Create node_modules/build-a-npm directory and copy publish.js
    const publishDir = path.join("node_modules", "build-a-npm");
    fs.mkdirSync(publishDir, { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, "..", "publish.js"),
      path.join(publishDir, "publish.js")
    );
    console.log(
      colorize("✅ Copied publish.js to node_modules/build-a-npm", "32")
    );

    // Generate .npmrc if GitHub or Both selected and token not skipped
    if (
      ["GitHub Packages", "Both"].includes(answers.publishTo) &&
      answers.githubToken.toLowerCase() !== "na"
    ) {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken
      );
      fs.writeFileSync(".npmrc", npmrcContent);
      console.log(colorize("✅ Generated .npmrc", "32"));
    }

    // Generate README.md
    const readmeContent = generateReadme(answers);
    fs.writeFileSync("README.md", readmeContent);
    console.log(colorize("✅ Generated README.md", "32"));

    // Generate LICENSE if applicable
    const licenseContent = generateLicense(answers.license, answers.authorName);
    if (licenseContent) {
      fs.writeFileSync("LICENSE", licenseContent);
      console.log(colorize("✅ Generated LICENSE", "32"));
    }

    // Generate main index.js file if it doesn't exist
    if (!fs.existsSync("index.js")) {
      const indexContent = generateIndexFile();
      fs.writeFileSync("index.js", indexContent);
      console.log(colorize("✅ Generated index.js", "32"));
    }

    // Generate GitHub Actions workflow if GitHub or Both selected
    if (["GitHub Packages", "Both"].includes(answers.publishTo)) {
      const workflowDir = path.join(".github", "workflows");
      fs.mkdirSync(workflowDir, { recursive: true });
      const workflowContent = generateGitHubWorkflow(answers);
      fs.writeFileSync(path.join(workflowDir, "publish.yml"), workflowContent);
      console.log(colorize("✅ Generated .github/workflows/publish.yml", "32"));
    }

    // Initialize git repository if not exists and --no-git flag is not set
    if (
      !noGit &&
      !fs.existsSync(".git") &&
      ["GitHub Packages", "Both"].includes(answers.publishTo)
    ) {
      try {
        execSync("git init", { stdio: "inherit" });
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
      const gitignoreContent = generateGitignore();
      fs.writeFileSync(".gitignore", gitignoreContent);
      console.log(colorize("✅ Generated .gitignore", "32"));
    }

    console.log("\n" + colorize("🎉 Package setup complete!", "1;36"));
    console.log("\n" + colorize("📋 Next steps:", "1;36"));
    if (["GitHub Packages", "Both"].includes(answers.publishTo)) {
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
    console.log(colorize("4. Add your package code to index.js", "36"));
    console.log(
      colorize(`5. Run \`npm run publish\` to publish your package`, "36")
    );
    console.log("\n" + colorize("💡 The publish script will:", "1;36"));
    console.log(
      colorize(
        "   - Automatically bump the patch version (use :minor or :major for other bumps)",
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
    console.log(
      colorize("   - Commit and push changes to your repository", "36")
    );
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