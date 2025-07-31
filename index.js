#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Dynamic import for inquirer (ES module)
async function getInquirer() {
  const inquirer = await import("inquirer");
  return inquirer.default;
}

async function promptPackageDetails() {
  const inquirer = await getInquirer();

  const questions = [
    {
      type: "list",
      name: "publishTo",
      message: "Where do you want to publish your package?",
      choices: ["npmjs", "GitHub Packages", "Both"],
      default: "Both",
    },
    {
      type: "list",
      name: "packageManager",
      message: "Which package manager do you want to use?",
      choices: ["npm", "Yarn", "pnpm", "Bun", "Other"],
      default: "npm",
    },
    {
      type: "input",
      name: "customPackageManager",
      message: "Enter the name of your custom package manager:",
      when: (answers) => answers.packageManager === "Other",
      validate: (input) =>
        input.trim() !== "" ? true : "Package manager name is required",
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
      message: "Enter your GitHub Personal Access Token (GITHUB_TOKEN):",
      when: (answers) =>
        ["GitHub Packages", "Both"].includes(answers.publishTo),
      validate: (input) => {
        if (input.trim() === "") return "GitHub token is required";
        if (!/^(ghp_|ghf_)?[A-Za-z0-9_]{36,}$/.test(input))
          return "Invalid GitHub token format. Ensure it's a valid Personal Access Token.";
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
    },
    {
      type: "input",
      name: "authorUrl",
      message: "Enter author URL:",
    },
    {
      type: "input",
      name: "homepage",
      message: "Enter homepage URL:",
      when: (answers) => answers.publishTo !== "GitHub Packages",
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

  return await inquirer.prompt(questions);
}

function generatePackageJson(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const repositoryUrl = isGitHub
    ? `https://github.com/${answers.githubUsername}/${answers.githubRepoName}.git`
    : answers.repositoryUrl
    ? answers.repositoryUrl.endsWith(".git")
      ? answers.repositoryUrl
      : answers.repositoryUrl + ".git"
    : "";

  const bugsUrl = repositoryUrl
    ? repositoryUrl.replace(".git", "") + "/issues"
    : "";
  const packageName =
    isGitHub && !answers.name.startsWith("@")
      ? `@${answers.githubUsername}/${answers.name}`
      : answers.name;
  const packageManager =
    answers.packageManager === "Other"
      ? answers.customPackageManager
      : answers.packageManager.toLowerCase();
  const isBun = packageManager === "bun";
  const runCommand = isBun ? packageManager : `${packageManager} run`;

  const packageJson = {
    name: packageName,
    version: "0.0.1",
    author: {
      name: answers.authorName,
      email: answers.authorEmail,
      url: answers.authorUrl,
    },
    description: answers.description,
    main: "index.js",
    license: answers.license,
    scripts: {
      publish: `${runCommand} publish:patch`,
      "publish:patch": `${packageManager} node_modules/build-a-npm/publish.js --${
        isGitHub ? "github --npmjs" : "npmjs"
      }`,
      "publish:minor": `${packageManager} node_modules/build-a-npm/publish.js --${
        isGitHub ? "github --npmjs" : "npmjs"
      } --minor`,
      "publish:major": `${packageManager} node_modules/build-a-npm/publish.js --${
        isGitHub ? "github --npmjs" : "npmjs"
      } --major`,
    },
    dependencies: {
      inquirer: "^12.9.0",
      "build-a-npm": "^0.1.8",
    },
    devDependencies: {},
  };

  if (repositoryUrl) {
    packageJson.repository = {
      type: "git",
      url: `git+${repositoryUrl}`,
    };
    packageJson.bugs = { url: bugsUrl };
  }

  if (answers.homepage) packageJson.homepage = answers.homepage;
  if (answers.keywords.length) packageJson.keywords = answers.keywords;
  if (isGitHub) {
    packageJson.publishConfig = {
      registry: "https://npm.pkg.github.com/",
      access: "public",
    };
  } else {
    packageJson.publishConfig = {
      registry: "https://registry.npmjs.org/",
      access: "public",
    };
  }

  // Remove empty fields to keep package.json clean
  if (!packageJson.author.email) delete packageJson.author.email;
  if (!packageJson.author.url) delete packageJson.author.url;
  if (!packageJson.description) delete packageJson.description;
  if (!packageJson.homepage) delete packageJson.homepage;
  if (!packageJson.keywords || !packageJson.keywords.length)
    delete packageJson.keywords;

  return JSON.stringify(packageJson, null, 2);
}

function generatePublishScript(
  publishTo,
  packageName,
  githubUsername,
  githubRepoName
) {
  const owner = githubUsername || "owner";
  const githubPackageName = packageName.startsWith("@")
    ? packageName
    : `@${owner}/${packageName}`;

  return `#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Dynamic import for inquirer
async function getInquirer() {
  const inquirer = await import('inquirer');
  return inquirer.default;
}

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1; // Patch
  }
  return parts.join('.');
}

const originalPackageJson = fs.readFileSync('package.json', 'utf-8');
const originalPkg = JSON.parse(originalPackageJson);
const args = process.argv.slice(2);
const versionType = args.includes('--major') ? 'major' : args.includes('--minor') ? 'minor' : 'patch';
const newVersion = bumpVersion(originalPkg.version, versionType);

// Update package.json with new version
const updatedPkg = { ...originalPkg, version: newVersion };
fs.writeFileSync('package.json', JSON.stringify(updatedPkg, null, 2));
console.log(\`\\n🚀 Bumped version from \${originalPkg.version} to \${newVersion}\`);

function publishVariant(name, registry) {
  const pkg = {
    ...updatedPkg,
    name,
    version: newVersion,
    publishConfig: {
      registry,
      access: 'public',
    },
  };

  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log(\`\\n📦 Publishing \${name}@\${newVersion} to \${registry}\`);

  try {
    execSync(\`npm publish --registry=\${registry}\`, { stdio: 'inherit' });
    console.log(\`✅ Published \${name}@\${newVersion} to \${registry}\`);
  } catch (err) {
    console.error(\`❌ Failed to publish \${name}:\`, err.message);
  }
}

async function confirmPublish(registry) {
  const inquirer = await getInquirer();
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: \`Publish new version \${newVersion} to \${registry}?\`,
      default: true
    }
  ]);
  return confirm;
}

async function main() {
  const publishNpmjs = args.includes('--npmjs') || ${
    publishTo === "Both" || publishTo === "npmjs"
  };
  const publishGithub = args.includes('--github') || ${
    publishTo === "Both" || publishTo === "GitHub Packages"
  };

  if (!publishNpmjs && !publishGithub) {
    console.log('No publish targets specified.');
    fs.writeFileSync('package.json', originalPackageJson);
    return;
  }

  if (publishNpmjs && (await confirmPublish('npmjs.com'))) {
    publishVariant(originalPkg.name, 'https://registry.npmjs.org/');
  }

  if (publishGithub && (await confirmPublish('GitHub Packages'))) {
    const scopedName = '${githubPackageName}';
    publishVariant(scopedName, 'https://npm.pkg.github.com/');
  }

  // Restore original package.json
  fs.writeFileSync('package.json', originalPackageJson);
  console.log('\\n🔄 package.json restored to original state.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
`;
}

function generateNpmrc(githubUsername, githubToken) {
  if (!githubUsername || !githubToken) return "";
  return `//npm.pkg.github.com/:_authToken=${githubToken}
@${githubUsername}:registry=https://npm.pkg.github.com/`;
}

function generateIndexFile() {
  return `// Your package main file
console.log('Hello from your new npm package!');

module.exports = {
  // Add your package exports here
  hello: () => console.log('Hello World!')
};
`;
}

function generateReadme(answers) {
  const packageName = answers.name;
  const publishTo = answers.publishTo;
  const packageManager =
    answers.packageManager === "Other"
      ? answers.customPackageManager
      : answers.packageManager.toLowerCase();
  const installCommand =
    packageManager === "bun" ? packageManager : `${packageManager} install`;

  return `# ${packageName}

${answers.description || "A new Node.js package"}

## Installation

\`\`\`bash
${installCommand} ${packageName}
\`\`\`

## Usage

Add your usage instructions here.

## Publishing

Run \`${
    packageManager === "bun" ? "bun" : `${packageManager} run`
  } publish\` to publish to ${
    publishTo === "Both"
      ? "npmjs.org and GitHub Packages"
      : publishTo === "npmjs"
      ? "npmjs.org"
      : "GitHub Packages"
  }.
Use \`${
    packageManager === "bun" ? "bun" : `${packageManager} run`
  } publish:minor\` or \`:major\` for minor or major version bumps.

## License

${answers.license}
`;
}

function generateLicense(license, authorName) {
  const year = new Date().getFullYear();
  if (license === "MIT") {
    return `MIT License

Copyright (c) ${year} ${authorName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  } else if (license === "ISC") {
    return `ISC License

Copyright (c) ${year} ${authorName}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
`;
  }
  return "";
}

function generateGitignore() {
  return `node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.tgz
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.npmrc
`;
}

async function init(noGit) {
  try {
    const isWindows = process.platform === "win32";
    console.log("🚀 Welcome to build-a-npm! Let's create your Node package.\n");

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
        console.log("⏹️  Cancelled. No files were modified.");
        return;
      }
    }

    // Prompt for package details
    const answers = await promptPackageDetails();

    // Generate package.json
    const packageJsonContent = generatePackageJson(answers);
    fs.writeFileSync("package.json", packageJsonContent);
    console.log("✅ Generated package.json");

    // Create node_modules/build-a-npm directory and copy publish.js
    const publishDir = path.join("node_modules", "build-a-npm");
    fs.mkdirSync(publishDir, { recursive: true });
    const publishScriptContent = generatePublishScript(
      answers.publishTo,
      answers.name,
      answers.githubUsername,
      answers.githubRepoName
    );
    fs.writeFileSync(path.join(publishDir, "publish.js"), publishScriptContent);
    console.log("✅ Generated publish.js in node_modules/build-a-npm");

    // Generate .npmrc if GitHub or Both selected
    if (["GitHub Packages", "Both"].includes(answers.publishTo)) {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken
      );
      fs.writeFileSync(".npmrc", npmrcContent);
      console.log("✅ Generated .npmrc");
    }

    // Generate README.md
    const readmeContent = generateReadme(answers);
    fs.writeFileSync("README.md", readmeContent);
    console.log("✅ Generated README.md");

    // Generate LICENSE if applicable
    const licenseContent = generateLicense(answers.license, answers.authorName);
    if (licenseContent) {
      fs.writeFileSync("LICENSE", licenseContent);
      console.log("✅ Generated LICENSE");
    }

    // Generate main index.js file if it doesn't exist
    if (!fs.existsSync("index.js")) {
      const indexContent = generateIndexFile();
      fs.writeFileSync("index.js", indexContent);
      console.log("✅ Generated index.js");
    }

    // Initialize git repository if not exists and --no-git flag is not set
    if (
      !noGit &&
      !fs.existsSync(".git") &&
      ["GitHub Packages", "Both"].includes(answers.publishTo)
    ) {
      try {
        execSync("git init", { stdio: "inherit" });
        console.log("✅ Initialized git repository");
      } catch (err) {
        console.log(
          "⚠️  Could not initialize git repository. You may need to do this manually."
        );
      }
    }

    // Create .gitignore if it doesn't exist
    if (!fs.existsSync(".gitignore")) {
      const gitignoreContent = generateGitignore();
      fs.writeFileSync(".gitignore", gitignoreContent);
      console.log("✅ Generated .gitignore");
    }

    const packageManager =
      answers.packageManager === "Other"
        ? answers.customPackageManager
        : answers.packageManager.toLowerCase();
    const installCommand =
      packageManager === "bun" ? packageManager : `${packageManager} install`;

    console.log("\n🎉 Package setup complete!");
    console.log("\n📋 Next steps:");
    if (["GitHub Packages", "Both"].includes(answers.publishTo)) {
      console.log(
        "1. Verify your GITHUB_TOKEN in .npmrc has the 'write:packages' scope"
      );
    }
    console.log(`2. Run \`${installCommand}\` to install dependencies`);
    if (isWindows) {
      console.log(
        "   - On Windows, run commands in an Administrator Command Prompt to avoid permissions errors"
      );
    } else {
      console.log(
        "   - Ensure you have write permissions for the project directory"
      );
    }
    console.log("3. Add your package code to index.js");
    console.log(
      `4. Run \`${
        packageManager === "bun" ? "bun" : `${packageManager} run`
      } publish\` to publish your package`
    );
    console.log("\n💡 The publish script will:");
    console.log(
      "   - Automatically bump the patch version (use :minor or :major for other bumps)"
    );
    console.log(
      `   - Publish to ${
        answers.publishTo === "Both"
          ? "both npmjs.org and GitHub Packages"
          : answers.publishTo
      }`
    );
    console.log("   - Commit and push changes to your repository");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const noGit = args.includes("--no-git");
  if (args.includes("init")) {
    await init(noGit);
  } else {
    console.log("Usage: npx build-a-npm init [--no-git]");
    console.log('Run "build-a-npm init" to create a new Node package.');
    console.log("Use --no-git to skip git repository initialization.");
    process.exit(1);
  }
}

// Run the main function
main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

module.exports = {
  init,
  promptPackageDetails,
  generatePackageJson,
  generatePublishScript,
  generateNpmrc,
  generateReadme,
  generateLicense,
  generateGitignore,
};
