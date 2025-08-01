const { getInquirer } = require("./utils");

async function promptPackageDetails() {
  const inquirer = await getInquirer();

  const questions = [
    {
      type: "list",
      name: "useNewDir",
      message: "Create a new directory for your project?",
      choices: ["Yes", "No"],
      default: "Yes",
    },
    {
      type: "input",
      name: "projectDir",
      message: "Enter the new directory name:",
      when: (answers) => answers.useNewDir === "Yes",
      validate: (input) => {
        if (input.trim() === "") return "Directory name is required";
        if (fs.existsSync(input)) return "Directory already exists";
        return true;
      },
    },
    {
      type: "list",
      name: "publishTo",
      message: "Where do you want to publish your package?",
      choices: ["npmjs", "GitHub Packages", "Both"],
      default: "Both",
    },
    {
      type: "input",
      name: "name",
      message: (answers) =>
        answers.publishTo === "npmjs"
          ? "Enter package name (e.g., my-package or @scope/my-package):"
          : "Enter package name (e.g., my-package):",
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
      default: "0.0.1",
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
    },
    {
      type: "input",
      name: "authorName",
      message: "Enter author name:",
    },
    {
      type: "input",
      name: "authorEmail",
      message: "Enter author email:",
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
      filter: (input) => {
        if (!input) return input;
        return input.match(/^https?:\/\//) ? input : `https://${input}`;
      },
    },
    {
      type: "input",
      name: "homepage",
      message: "Enter homepage URL:",
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
      default: "MIT",
    },
  ];

  const answers = await inquirer.prompt(questions);

  return answers;
}

module.exports = { promptPackageDetails };