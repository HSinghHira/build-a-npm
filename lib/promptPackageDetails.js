const { getInquirer, fs, logger, fetchNpmPackage } = require("./utils");

async function promptPackageDetails(config = {}) {
  const inquirer = await getInquirer();
  const dependencyList = [];

  const questions = [
    {
      type: "list",
      name: "useNewDir",
      message: "Create a new directory for your project?",
      choices: ["Yes, same as my Package Name", "Yes, a Custom Name", "No"],
      default: config.useNewDir || "Yes, same as my Package Name",
    },
    {
      type: "input",
      name: "projectDir",
      message: "Enter the new directory name:",
      default: config.projectDir,
      when: (answers) => answers.useNewDir === "Yes, a Custom Name",
      validate: (input) => {
        if (input.trim() === "") return "Directory name is required";
        if (fs.existsSync(input)) return "Directory already exists";
        if (!/^[a-z0-9-._]+$/.test(input))
          return "Directory name must contain only lowercase letters, numbers, hyphens, periods, or underscores";
        return true;
      },
    },
    {
      type: "list",
      name: "useMonorepo",
      message: "Is this package part of a monorepo?",
      choices: ["Yes", "No"],
      default: config.useMonorepo ? "Yes" : "No",
    },
    {
      type: "input",
      name: "monorepoRoot",
      message:
        "Enter the monorepo root directory (relative to current directory):",
      default: config.monorepoRoot || ".",
      when: (answers) => answers.useMonorepo === "Yes",
      validate: (input) => {
        if (input.trim() === "") return "Monorepo root directory is required";
        return true;
      },
    },
    {
      type: "list",
      name: "packageManager",
      message: "Choose a package manager for the monorepo:",
      choices: ["npm", "pnpm", "yarn"],
      default: config.packageManager || "npm",
      when: (answers) => answers.useMonorepo === "Yes",
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
      type: "list",
      name: "createGitHubWorkflow",
      message: "Create a GitHub Actions workflow file (publish.yml)?",
      choices: ["Yes", "No"],
      default:
        config.createGitHubWorkflow !== undefined
          ? config.createGitHubWorkflow
            ? "Yes"
            : "No"
          : "Yes",
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
    },
    {
      type: "list",
      name: "createGitHubRepo",
      message: "Create a GitHub repository automatically?",
      choices: ["Yes", "No"],
      default: config.createGitHubRepo ? "Yes" : "No",
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
    },
    {
      type: "list",
      name: "ciProvider",
      message: "Choose a CI/CD provider for workflows:",
      choices: ["GitHub Actions", "GitLab CI", "CircleCI", "None"],
      default: config.ciProvider || "GitHub Actions",
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
      type: "list",
      name: "version",
      message: "Select initial version:",
      choices: ["0.0.1 (Recommended)", "0.1.0", "1.0.0", "Custom"],
      default: config.version || "0.0.1 (Recommended)",
    },
    {
      type: "input",
      name: "customVersion",
      message: "Enter custom version (e.g., 1.0.0):",
      when: (answers) => answers.version === "Custom",
      validate: (input) => {
        if (!/^\d+\.\d+\.\d+$/.test(input))
          return "Version must be in the format x.y.z (e.g., 1.0.0)";
        return true;
      },
    },
    {
      type: "list",
      name: "moduleType",
      message: "Choose module type:",
      choices: ["ES Modules", "CommonJS"],
      default: config.moduleType || "CommonJS",
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
      default: (answers) => config.githubRepoName || answers.name,
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
      type: "list",
      name: "useTypeScript",
      message: "Use TypeScript for your project?",
      choices: ["Yes", "No"],
      default: config.useTypeScript ? "Yes" : "No",
    },
    {
      type: "list",
      name: "useESLint",
      message: "Add ESLint for linting?",
      choices: ["Yes", "No"],
      default: config.useESLint ? "Yes" : "No",
    },
    {
      type: "list",
      name: "usePrettier",
      message: "Add Prettier for code formatting?",
      choices: ["Yes", "No"],
      default: config.usePrettier ? "Yes" : "No",
    },
    {
      type: "list",
      name: "testFramework",
      message: "Choose a testing framework:",
      choices: ["Jest", "Mocha", "Vitest", "None"],
      default: config.testFramework || "None",
    },
    {
      type: "list",
      name: "addDependency",
      message: "Add a dependency to your project?",
      choices: ["Yes", "No"],
      default: "No",
    },
    {
      type: "input",
      name: "dependencyName",
      message: "Enter dependency name (e.g., lodash):",
      when: (answers) => answers.addDependency === "Yes",
      validate: async (input) => {
        if (input.trim() === "") return "Dependency name is required";
        const valid = await fetchNpmPackage(input);
        if (!valid) return `Package "${input}" not found in npm registry`;
        return true;
      },
    },
    {
      type: "input",
      name: "dependencyVersion",
      message:
        "Enter dependency version (e.g., ^4.17.21, or 'latest' to skip):",
      default: "latest",
      when: (answers) => answers.addDependency === "Yes",
    },
    {
      type: "list",
      name: "addAnotherDependency",
      message: "Add another dependency?",
      choices: ["Yes", "No"],
      default: "No",
      when: (answers) => answers.addDependency === "Yes",
      loop: true,
    },
    {
      type: "list",
      name: "addDevDependency",
      message: "Add a devDependency to your project?",
      choices: ["Yes", "No"],
      default: "No",
    },
    {
      type: "input",
      name: "devDependencyName",
      message: "Enter devDependency name (e.g., eslint):",
      when: (answers) => answers.addDevDependency === "Yes",
      validate: async (input) => {
        if (input.trim() === "") return "DevDependency name is required";
        const valid = await fetchNpmPackage(input);
        if (!valid) return `Package "${input}" not found in npm registry`;
        return true;
      },
    },
    {
      type: "input",
      name: "devDependencyVersion",
      message:
        "Enter devDependency version (e.g., ^8.0.0, or 'latest' to skip):",
      default: "latest",
      when: (answers) => answers.addDevDependency === "Yes",
    },
    {
      type: "list",
      name: "addAnotherDevDependency",
      message: "Add another devDependency?",
      choices: ["Yes", "No"],
      default: "No",
      when: (answers) => answers.addDevDependency === "Yes",
      loop: true,
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

  // Handle dependency loops
  const answers = await inquirer.prompt(questions);
  while (
    answers.addDependency === "Yes" &&
    answers.addAnotherDependency === "Yes"
  ) {
    const depAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "dependencyName",
        message: "Enter dependency name (e.g., lodash):",
        validate: async (input) => {
          if (input.trim() === "") return "Dependency name is required";
          const valid = await fetchNpmPackage(input);
          if (!valid) return `Package "${input}" not found in npm registry`;
          return true;
        },
      },
      {
        type: "input",
        name: "dependencyVersion",
        message:
          "Enter dependency version (e.g., ^4.17.21, or 'latest' to skip):",
        default: "latest",
      },
      {
        type: "list",
        name: "addAnotherDependency",
        message: "Add another dependency?",
        choices: ["Yes", "No"],
        default: "No",
      },
    ]);
    dependencyList.push({
      name: depAnswers.dependencyName,
      version: depAnswers.dependencyVersion,
      type: "dependency",
    });
    answers.addAnotherDependency = depAnswers.addAnotherDependency;
  }
  if (answers.addDependency === "Yes") {
    dependencyList.push({
      name: answers.dependencyName,
      version: answers.dependencyVersion,
      type: "dependency",
    });
  }

  while (
    answers.addDevDependency === "Yes" &&
    answers.addAnotherDevDependency === "Yes"
  ) {
    const devDepAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "devDependencyName",
        message: "Enter devDependency name (e.g., eslint):",
        validate: async (input) => {
          if (input.trim() === "") return "DevDependency name is required";
          const valid = await fetchNpmPackage(input);
          if (!valid) return `Package "${input}" not found in npm registry`;
          return true;
        },
      },
      {
        type: "input",
        name: "devDependencyVersion",
        message:
          "Enter devDependency version (e.g., ^8.0.0, or 'latest' to skip):",
        default: "latest",
      },
      {
        type: "list",
        name: "addAnotherDevDependency",
        message: "Add another devDependency?",
        choices: ["Yes", "No"],
        default: "No",
      },
    ]);
    dependencyList.push({
      name: devDepAnswers.devDependencyName,
      version: devDepAnswers.devDependencyVersion,
      type: "devDependency",
    });
    answers.addAnotherDevDependency = devDepAnswers.addAnotherDevDependency;
  }
  if (answers.addDevDependency === "Yes") {
    dependencyList.push({
      name: answers.devDependencyName,
      version: answers.devDependencyVersion,
      type: "devDependency",
    });
  }

  // Map version choice to actual version
  answers.version =
    answers.version === "Custom"
      ? answers.customVersion
      : answers.version.split(" ")[0];
  answers.dependencies = dependencyList
    .filter((dep) => dep.type === "dependency")
    .reduce((acc, dep) => {
      acc[dep.name] = dep.version;
      return acc;
    }, {});
  answers.devDependencies = dependencyList
    .filter((dep) => dep.type === "devDependency")
    .reduce((acc, dep) => {
      acc[dep.name] = dep.version;
      return acc;
    }, {});
  delete answers.customVersion;
  delete answers.dependencyName;
  delete answers.dependencyVersion;
  delete answers.addDependency;
  delete answers.addAnotherDependency;
  delete answers.devDependencyName;
  delete answers.devDependencyVersion;
  delete answers.addDevDependency;
  delete answers.addAnotherDevDependency;

  logger.debug("Final answers:", answers);
  return answers;
}

module.exports = { promptPackageDetails };
