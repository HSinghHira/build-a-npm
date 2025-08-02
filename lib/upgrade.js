const { colorize, getInquirer, fs, path } = require("./utils");
const { generatePackageJson } = require("./generatePackageJson");
const { generateNpmrc } = require("./generateNpmrc");
const { generateGitignore } = require("./generateGitignore");
const { generateGitHubWorkflow } = require("./generateGitHubWorkflow");
const { generateTsConfig } = require("./generateTsConfig");
const { generateEslintConfig } = require("./generateEslintConfig");
const { generatePrettierConfig } = require("./generatePrettierConfig");

async function upgrade(packageVersion, verbose) {
  try {
    if (verbose) {
      console.log(colorize(`📋 Running in verbose mode`, "36"));
      console.log(colorize(`📍 Current directory: ${process.cwd()}`, "36"));
    }
    console.log(
      colorize(
        `🚀 Upgrading package with build-a-npm v${packageVersion}`,
        "36"
      ) + "\n"
    );

    // Check if package.json exists
    if (!fs.existsSync("package.json")) {
      console.error(
        colorize("❌ No package.json found in the current directory.", "31")
      );
      console.log(
        colorize(
          "💡 Run this command in a directory with an existing package.json or use `npx build-a-npm init` to create a new package.",
          "33"
        )
      );
      process.exit(1);
    }

    // Read existing package.json
    const existingPackageJson = JSON.parse(
      fs.readFileSync("package.json", "utf-8")
    );

    // Check if build-a-npm is in devDependencies
    if (
      !existingPackageJson.devDependencies ||
      !existingPackageJson.devDependencies["build-a-npm"]
    ) {
      console.error(
        colorize(
          "❌ This package does not use build-a-npm as a devDependency.",
          "31"
        )
      );
      console.log(
        colorize(
          "💡 Ensure `build-a-npm` is listed in devDependencies in package.json.",
          "33"
        )
      );
      process.exit(1);
    }

    // Prompt for confirmation and additional features
    const inquirer = await getInquirer();
    const {
      confirm,
      createGitHubWorkflow,
      useTypeScript,
      useESLint,
      usePrettier,
      access,
    } = await inquirer.prompt([
      {
        type: "list",
        name: "confirm",
        message:
          "Update this package with the latest build-a-npm features? This will modify package.json, add missing files, and update scripts.",
        choices: ["Yes", "No"],
        default: "Yes",
      },
      {
        type: "list",
        name: "createGitHubWorkflow",
        message: "Create a GitHub Actions workflow file (publish.yml)?",
        choices: ["Yes", "No"],
        default: "Yes",
        when: (answers) =>
          answers.confirm === "Yes" &&
          existingPackageJson.publishConfig?.registry?.includes(
            "npm.pkg.github.com"
          ),
      },
      {
        type: "list",
        name: "useTypeScript",
        message: "Add TypeScript support?",
        choices: ["Yes", "No"],
        default: existingPackageJson.types ? "Yes" : "No",
        when: (answers) => answers.confirm === "Yes",
      },
      {
        type: "list",
        name: "useESLint",
        message: "Add ESLint for linting?",
        choices: ["Yes", "No"],
        default: existingPackageJson.devDependencies?.eslint ? "Yes" : "No",
        when: (answers) => answers.confirm === "Yes",
      },
      {
        type: "list",
        name: "usePrettier",
        message: "Add Prettier for code formatting?",
        choices: ["Yes", "No"],
        default: existingPackageJson.devDependencies?.prettier ? "Yes" : "No",
        when: (answers) => answers.confirm === "Yes",
      },
      {
        type: "list",
        name: "access",
        message: "Package access level:",
        choices: ["public", "private"],
        default: existingPackageJson.publishConfig?.access || "public",
        when: (answers) => answers.confirm === "Yes",
      },
    ]);

    if (confirm === "No") {
      console.log(colorize("⏹️  Cancelled. No files were modified.", "33"));
      return;
    }

    // Determine publishTo based on existing package.json
    const isGitHub =
      existingPackageJson.publishConfig?.registry?.includes(
        "npm.pkg.github.com"
      );
    const publishTo = isGitHub
      ? existingPackageJson.publishConfig?.registry?.includes(
          "registry.npmjs.org"
        )
        ? "Both"
        : "GitHub Packages"
      : "npmjs";

    // Generate answers based on existing package.json
    const answers = {
      publishTo,
      createGitHubWorkflow:
        createGitHubWorkflow !== undefined ? createGitHubWorkflow : "No",
      useTypeScript,
      useESLint,
      usePrettier,
      access,
      name: existingPackageJson.name,
      version: existingPackageJson.version,
      githubUsername: isGitHub
        ? existingPackageJson.name.split("/")[0]?.replace("@", "")
        : "sampleuser",
      githubRepoName:
        existingPackageJson.repository?.url
          ?.split("/")
          .slice(-1)[0]
          ?.replace(".git", "") || "sample-package",
      githubToken: "NA",
      description: existingPackageJson.description || "",
      authorName:
        existingPackageJson.author?.name ||
        existingPackageJson.author ||
        "Sample Author",
      authorEmail: existingPackageJson.author?.email || "",
      authorUrl: existingPackageJson.author?.url || "",
      homepage: existingPackageJson.homepage || "",
      keywords: existingPackageJson.keywords || [],
      license: existingPackageJson.license || "MIT",
      customScripts: existingPackageJson.scripts
        ? Object.fromEntries(
            Object.entries(existingPackageJson.scripts).filter(
              ([key]) =>
                ![
                  "test",
                  "publish",
                  "publish:patch",
                  "publish:minor",
                  "publish:major",
                  "github",
                ].includes(key)
            )
          )
        : {},
    };

    // Update package.json scripts and devDependencies
    const updatedPackageJson = JSON.parse(generatePackageJson(answers));
    existingPackageJson.scripts = {
      ...existingPackageJson.scripts,
      ...updatedPackageJson.scripts,
    };
    existingPackageJson.devDependencies = {
      ...existingPackageJson.devDependencies,
      ...updatedPackageJson.devDependencies,
    };
    existingPackageJson.main = updatedPackageJson.main;
    existingPackageJson.types = updatedPackageJson.types;
    existingPackageJson.publishConfig = updatedPackageJson.publishConfig;
    if (verbose) {
      console.log(colorize(`📄 Updated package.json content:`, "36"));
      console.log(JSON.stringify(existingPackageJson, null, 2));
    }
    fs.writeFileSync(
      "package.json",
      JSON.stringify(existingPackageJson, null, 2)
    );
    console.log(colorize("✅ Updated package.json", "32"));

    // Ensure publish.js is in node_modules/build-a-npm
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
      colorize("✅ Ensured publish.js in node_modules/build-a-npm", "32")
    );

    // Generate .npmrc if needed and not present
    if (
      ["GitHub Packages", "Both"].includes(answers.publishTo) &&
      !fs.existsSync(".npmrc")
    ) {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken
      );
      if (npmrcContent) {
        if (verbose) {
          console.log(colorize(`📄 .npmrc content:`, "36"));
          console.log(npmrcContent);
        }
        fs.writeFileSync(".npmrc", npmrcContent);
        console.log(colorize("✅ Generated .npmrc", "32"));
      }
    }

    // Generate tsconfig.json if TypeScript is selected and not present
    if (answers.useTypeScript === "Yes" && !fs.existsSync("tsconfig.json")) {
      const tsConfigContent = generateTsConfig();
      if (verbose) {
        console.log(colorize(`📄 tsconfig.json content:`, "36"));
        console.log(tsConfigContent);
      }
      fs.writeFileSync("tsconfig.json", tsConfigContent);
      console.log(colorize("✅ Generated tsconfig.json", "32"));
    }

    // Generate .eslintrc.json if ESLint is selected and not present
    if (answers.useESLint === "Yes" && !fs.existsSync(".eslintrc.json")) {
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

    // Generate .prettierrc if Prettier is selected and not present
    if (answers.usePrettier === "Yes" && !fs.existsSync(".prettierrc")) {
      const prettierConfigContent = generatePrettierConfig();
      if (verbose) {
        console.log(colorize(`📄 .prettierrc content:`, "36"));
        console.log(prettierConfigContent);
      }
      fs.writeFileSync(".prettierrc", prettierConfigContent);
      console.log(colorize("✅ Generated .prettierrc", "32"));
    }

    // Generate GitHub Actions workflow if needed
    if (
      ["GitHub Packages", "Both"].includes(answers.publishTo) &&
      answers.createGitHubWorkflow === "Yes" &&
      !fs.existsSync(".github/workflows/publish.yml")
    ) {
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

    // Update .gitignore if needed
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

    console.log("\n" + colorize("🎉 Package upgrade complete!", "1;36"));
    console.log("\n" + colorize("📋 Next steps:", "1;36"));
    console.log(colorize("1. Run `npm install` to update dependencies", "36"));
    if (isWindows) {
      console.log(
        colorize(
          "   - On Windows, run commands in an Administrator Command Prompt to avoid permissions errors",
          "33"
        )
      );
    }
    console.log(
      colorize(
        `2. Verify your package.json and other files, then run \`npm run publish\` to publish`,
        "36"
      )
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

module.exports = { upgrade };
