const { input, select, confirm, checkbox } = require("@inquirer/prompts");
const { validateConfig } = require("./utils");

async function promptPackageDetails(config = {}) {
  const answers = {};

  answers.useNewDir = await select({
    message: "Create a new directory for your project?",
    choices: [
      {
        name: "Yes, same as my Package Name",
        value: "Yes, same as my Package Name",
      },
      { name: "Yes, a Custom Name", value: "Yes, a Custom Name" },
      { name: "No", value: "No" },
    ],
    default: config.useNewDir || "Yes, same as my Package Name",
  });

  if (answers.useNewDir === "Yes, a Custom Name") {
    answers.projectDir = await input({
      message: "Enter the directory name for your project",
      default: config.projectDir || "my-package",
      validate: (value) => (value ? true : "Directory name is required"),
    });
  }

  answers.isMonorepo = await confirm({
    message: "Is this package part of a monorepo?",
    default: config.isMonorepo || false,
  });

  answers.publishTo = await select({
    message: "Where do you want to publish your package?",
    choices: [
      { name: "npmjs", value: "npmjs" },
      { name: "GitHub Packages", value: "GitHub Packages" },
      { name: "Both", value: "Both" },
    ],
    default: config.publishTo || "npmjs",
  });

  answers.access = await select({
    message: "Package access level",
    choices: [
      { name: "public", value: "public" },
      { name: "restricted", value: "restricted" },
    ],
    default: config.access || "public",
  });

  answers.createGitHubWorkflow = await confirm({
    message: "Create a GitHub Actions workflow file (publish.yml)?",
    default: config.createGitHubWorkflow || true,
  });

  answers.ciProvider = await select({
    message: "Choose a CI/CD provider for workflows",
    choices: [
      { name: "GitHub Actions", value: "GitHub Actions" },
      { name: "CircleCI", value: "CircleCI" },
      { name: "GitLab CI/CD", value: "GitLab CI/CD" },
    ],
    default: config.ciProvider || "GitHub Actions",
  });

  answers.createGitHubRepo = await confirm({
    message: "Create a GitHub repository automatically?",
    default: config.createGitHubRepo || false,
  });

  answers.githubUsername = await input({
    message: "Enter your GitHub username",
    default: config.githubUsername || "your-username",
    validate: (value) => (value ? true : "GitHub username is required"),
  });

  answers.name = await input({
    message: "Enter your Package Name",
    default: config.name || "my-package",
    validate: (value) => (value ? true : "Package name is required"),
  });

  if (
    answers.createGitHubRepo ||
    ["GitHub Packages", "Both"].includes(answers.publishTo)
  ) {
    answers.githubRepoName = await input({
      message: "Enter your GitHub repository name",
      default: config.githubRepoName || answers.name,
      validate: (value) => (value ? true : "Repository name is required"),
    });

    answers.githubToken = await input({
      message:
        "Enter your GitHub Personal Access Token (GITHUB_TOKEN) or 'NA' to skip",
      default: config.githubToken || "NA",
    });
  }

  answers.useVitePress = await confirm({
    message: "Add VitePress for documentation support?",
    default: config.useVitePress || false,
  });

  if (answers.useVitePress) {
    answers.docsDir = await input({
      message: "Enter the documentation directory (relative to project root)",
      default: config.docsDir || "docs",
      validate: (value) =>
        value ? true : "Documentation directory is required",
    });

    if (answers.createGitHubRepo) {
      answers.basePath = await input({
        message: "Enter the base path for GitHub Pages (e.g., /<repo-name>/)",
        default:
          config.basePath || `/${answers.githubRepoName || answers.name}/`,
        validate: (value) =>
          value.startsWith("/") ? true : "Base path must start with /",
      });
    }
  }

  answers.version = await select({
    message: "Select initial version",
    choices: [
      { name: "0.0.1 (Recommended)", value: "0.0.1" },
      { name: "0.1.0", value: "0.1.0" },
      { name: "1.0.0", value: "1.0.0" },
    ],
    default: config.version || "0.0.1",
  });

  answers.moduleType = await select({
    message: "Choose module type",
    choices: [
      { name: "ES Modules", value: "ES Modules" },
      { name: "CommonJS", value: "CommonJS" },
    ],
    default: config.moduleType || "CommonJS",
  });

  answers.description = await input({
    message: "Enter package description",
    default: config.description || "",
  });

  answers.authorName = await input({
    message: "Enter author name",
    default: config.authorName || "",
  });

  answers.authorEmail = await input({
    message: "Enter author email",
    default: config.authorEmail || "",
    validate: (value) =>
      /^([^@\s]+@[^@\s]+\.[^@\s]+)?$/.test(value)
        ? true
        : "Invalid email format",
  });

  answers.authorUrl = await input({
    message: "Enter author URL",
    default: config.authorUrl || "",
  });

  answers.homepage = await input({
    message: "Enter homepage URL",
    default: config.homepage || "",
  });

  answers.keywords = await input({
    message: "Enter keywords (comma-separated)",
    default: config.keywords ? config.keywords.join(", ") : "",
    transform: (value) =>
      value
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
  });

  answers.license = await select({
    message: "Choose a license",
    choices: [
      { name: "MIT", value: "MIT" },
      { name: "Apache-2.0", value: "Apache-2.0" },
      { name: "GPL-3.0", value: "GPL-3.0" },
      { name: "None", value: "None" },
    ],
    default: config.license || "MIT",
  });

  answers.useTypeScript = await confirm({
    message: "Use TypeScript for your project?",
    default: config.useTypeScript || false,
  });

  answers.useESLint = await confirm({
    message: "Add ESLint for linting?",
    default: config.useESLint || false,
  });

  answers.usePrettier = await confirm({
    message: "Add Prettier for code formatting?",
    default: config.usePrettier || false,
  });

  answers.testFramework = await select({
    message: "Choose a testing framework",
    choices: [
      { name: "None", value: "None" },
      { name: "Jest", value: "Jest" },
      { name: "Mocha", value: "Mocha" },
      { name: "Vitest", value: "Vitest" },
    ],
    default: config.testFramework || "None",
  });

  answers.useNodePackageBuilder = await confirm({
    message: "Include Node Package Builder settings for easy publishing?",
    default: config.useNodePackageBuilder || true,
  });

  answers.dependencies = await checkbox({
    message: "Select dependencies to add to your project",
    choices: [
      { name: "express", value: "express" },
      { name: "lodash", value: "lodash" },
      { name: "axios", value: "axios" },
    ],
    default: config.dependencies || [],
  }).then((selected) =>
    Object.fromEntries(selected.map((dep) => [dep, "latest"]))
  );

  answers.devDependencies = await checkbox({
    message: "Select devDependencies to add to your project",
    choices: [
      { name: "nodemon", value: "nodemon" },
      { name: "webpack", value: "webpack" },
      { name: "typescript", value: "typescript" },
    ],
    default: config.devDependencies || [],
  }).then((selected) =>
    Object.fromEntries(selected.map((dep) => [dep, "latest"]))
  );

  answers.customScripts = await input({
    message: "Add custom npm scripts (format: name:command, comma-separated)",
    default: config.customScripts
      ? Object.entries(config.customScripts)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ")
      : "",
    transform: (value) =>
      value
        ? Object.fromEntries(
            value.split(",").map((script) => {
              const [name, command] = script.split(":").map((s) => s.trim());
              return [name, command];
            })
          )
        : {},
  });

  return answers;
}

module.exports = { promptPackageDetails };
