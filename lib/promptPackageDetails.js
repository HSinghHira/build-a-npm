const { getInquirer } = require("./utils");

async function promptPackageDetails(config = {}) {
  const inquirer = await getInquirer();

  const questions = [
    {
      type: "list",
      name: "useNewDir",
      message: "Create a new directory for your project?",
      choices: ["Yes", "No"],
      default: config.useNewDir || "Yes",
    },
    {
      type: "input",
      name: "projectDir",
      message: "Enter the new directory name:",
      default: config.projectDir,
      when: (answers) => answers.useNewDir === "Yes",
      validate: (input) => {
        if (input.trim() === "") return "Directory name is required";
        if (fs.existsSync(input)) return "Directory already exists";
        return true;
      },
    },
    {
      type: "confirm",
      name: "useMonorepo",
      message: "Is this package part of a monorepo?",
      default: config.useMonorepo || false,
    },
    {
      type: "list",
      name: "publishTo",
      message: "Where do you want to publish your package?",
      choices: ["npmjs", "GitHub Packages", "Both"],
      default: config.publishTo || "Both",
    },
    {
      type: "list",
      name: "access",
      message: "Package access level:",
      choices: ["public", "private"],
      default: config.access || "public",
    },
    {
      type: "confirm",
      name: "createGitHubWorkflow",
      message: "Create a GitHub Actions workflow file (publish.yml)?",
      default:
        config.createGitHubWorkflow !== undefined
          ? config.createGitHubWorkflow
          : true,
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
    },
    {
      type: "input",
      name: "name",
      message: (answers) =>
        answers.publishTo === "npmjs"
          ? "Enter package name (e.g., my-package or @scope/my-package):"
          : "Enter package name (e.g., my-package):",
      default: config.name,
      validate: (input) => {
        if (input.trim() === "") return "Package name is required";
        if (!/^[a-z0-9-@][a-z0-9-\/]*$/.test(input))
          return "Package name must be lowercase and contain only letters, numbers, hyphens, or slashes (for scoped packages)";
        return true;
      },
    },
    {
      type: "input",
      name: "version",
      message: "Enter initial version (e.g., 1.0.0):",
      default: config.version || "0.0.1",
      validate: (input) => {
        if (!/^\d+\.\d+\.\d+$/.test(input))
          return "Version must be in the format x.y.z (e.g., 1.0.0)";
        return true;
      },
    },
    {
      type: "input",
      name: "githubUsername",
      message: "Enter your GitHub username:",
      default: config.githubUsername,
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
      validate: (input) =>
        input.trim() !== "" ? true : "GitHub username is required",
      filter: (input) => input.toLowerCase(),
    },
    {
      type: "input",
      name: "githubRepoName",
      message: "Enter your GitHub repository name:",
      default: config.githubRepoName,
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
      validate: (input) =>
        input.trim() !== "" ? true : "GitHub repository name is required",
    },
    {
      type: "input",
      name: "githubToken",
      message:
        "Enter your GitHub Personal Access Token (GITHUB_TOKEN) or 'NA' to skip:",
      default: config.githubToken,
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
      validate: (input) => {
        input = input.trim();
        if (input.toLowerCase() === "na") return true;
        if (input === "")
          return "GitHub token is required (or enter 'NA' to skip)";
        if (!/^(ghp_|ghf_)?[A-Za-z0-9_]{36,}$/.test(input))
          return "Invalid GitHub token format. Ensure it's a valid Personal Access Token or enter 'NA' to skip.";
        return true;
      },
    },
    {
      type: "input",
      name: "description",
      message: "Enter package description:",
      default: config.description,
    },
    {
      type: "input",
      name: "authorName",
      message: "Enter author name:",
      default: config.authorName,
    },
    {
      type: "input",
      name: "authorEmail",
      message: "Enter author email:",
      default: config.authorEmail,
      validate: (input) => {
        if (!input) return true; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input)
          ? true
          : "Please enter a valid email address";
      },
    },
    {
      type: "input",
      name: "authorUrl",
      message: "Enter author URL:",
      default: config.authorUrl,
      filter: (input) => {
        if (!input) return input;
        return input.match(/^https?:\/\//) ? input : `https://${input}`;
      },
    },
    {
      type: "input",
      name: "homepage",
      message: "Enter homepage URL:",
      default: config.homepage,
      when: (answers) => answers.publishTo !== "GitHub Packages",
      filter: (input) => {
        if (!input) return input;
        return input.match(/^https?:\/\//) ? input : `https://${input}`;
      },
    },
    {
      type: "input",
      name: "keywords",
      message: "Enter keywords (comma-separated):",
      default: config.keywords ? config.keywords.join(", ") : "",
      filter: (input) =>
        input
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k),
    },
    {
      type: "list",
      name: "license",
      message: "Choose a license:",
      choices: ["MIT", "ISC", "Apache-2.0", "GPL-3.0", "Unlicense"],
      default: config.license || "MIT",
    },
    {
      type: "confirm",
      name: "useTypeScript",
      message: "Use TypeScript for your project?",
      default: config.useTypeScript || false,
    },
    {
      type: "confirm",
      name: "useESLint",
      message: "Add ESLint for linting?",
      default: config.useESLint || false,
    },
    {
      type: "confirm",
      name: "usePrettier",
      message: "Add Prettier for code formatting?",
      default: config.usePrettier || false,
    },
    {
      type: "input",
      name: "customScripts",
      message: "Enter custom npm scripts (e.g., lint:eslint ., test:jest):",
      default: config.customScripts
        ? Object.entries(config.customScripts)
            .map(([k, v]) => `${k}:${v}`)
            .join(", ")
        : "",
      filter: (input) => {
        if (!input) return {};
        const scripts = {};
        input.split(",").forEach((pair) => {
          const [key, value] = pair.split(":").map((s) => s.trim());
          if (key && value) scripts[key] = value;
        });
        return scripts;
      },
    },
  ];

  const answers = await inquirer.prompt(questions);
  return answers;
}

module.exports = { promptPackageDetails };
