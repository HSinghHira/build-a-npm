#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Dynamically resolve package.json
let packageVersion = "unknown";
try {
  const packageJsonPath = require.resolve("build-a-npm/package.json");
  packageVersion = require(packageJsonPath).version;
} catch (err) {
  console.warn("⚠️ Could not load package version:", err.message);
}

// Dynamic import for inquirer (ES module)
async function getInquirer() {
  const inquirer = await import("inquirer");
  return inquirer.default;
}

// Check if terminal supports colors
const supportsColor = process.stdout.isTTY && process.env.TERM !== "dumb";

function colorize(text, code) {
  return supportsColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

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

  // Change to new directory if specified
  if (answers.useNewDir === "Yes") {
    fs.mkdirSync(answers.projectDir);
    process.chdir(answers.projectDir);
  }

  return answers;
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

  const packageJson = {
    name: packageName,
    version: answers.version,
    author: {
      name: answers.authorName,
      email: answers.authorEmail,
      url: answers.authorUrl,
    },
    description: answers.description,
    main: "index.js",
    license: answers.license,
    scripts: {
      test: "jest",
      publish: isGitHub
        ? "npm run publish:patch && npm run github"
        : "npm run publish:patch",
      "publish:patch": `node node_modules/build-a-npm/publish.js ${
        isGitHub ? "--github --npmjs" : "--npmjs"
      }`,
      "publish:minor": `node node_modules/build-a-npm/publish.js ${
        isGitHub ? "--github --npmjs" : "--npmjs"
      } --minor`,
      "publish:major": `node node_modules/build-a-npm/publish.js ${
        isGitHub ? "--github --npmjs" : "--npmjs"
      } --major`,
    },
    dependencies: {
      inquirer: "^12.9.0",
      "build-a-npm": "^0.1.8",
    },
    devDependencies: {
      jest: "^29.7.0",
    },
  };

  if (isGitHub) {
    packageJson.scripts.github =
      'git add -A && git commit -m "Building" && git push';
  }

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

function checkNpmLogin() {
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    return true;
  } catch (err) {
    console.error('❌ Not logged into npm. Please run \`npm login\` to authenticate.');
    return false;
  }
}

function checkGitHubToken() {
  if (fs.existsSync('.npmrc')) {
    const npmrcContent = fs.readFileSync('.npmrc', 'utf-8');
    if (npmrcContent.includes('npm.pkg.github.com') && npmrcContent.includes('_authToken')) {
      return true;
    }
  }
  if (process.env.GITHUB_TOKEN) {
    return true;
  }
  console.error('❌ GITHUB_TOKEN not set or .npmrc missing. Please set GITHUB_TOKEN environment variable or configure .npmrc with a valid GitHub token.');
  return false;
}

function commitVersion(newVersion) {
  try {
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(\`git commit -m "Bump version to \${newVersion}"\`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log(\`✅ Committed and pushed version \${newVersion}\`);
  } catch (err) {
    console.error(\`❌ Failed to commit version \${newVersion}: \${err.message}\`);
    throw err;
  }
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
    console.error(\`❌ Failed to publish \${name} to \${registry}: \${err.message}\`);
    console.error(\`💡 Ensure you have the correct permissions and are authenticated. Run \`npm login\` for npmjs or verify your GITHUB_TOKEN for GitHub Packages.\`);
    throw err;
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

  try {
    // Commit the version bump
    commitVersion(newVersion);

    if (publishNpmjs) {
      if (!checkNpmLogin()) {
        console.error('❌ Please authenticate with npm before publishing.');
        process.exit(1);
      }
      if (await confirmPublish('npmjs.com')) {
        publishVariant(originalPkg.name, 'https://registry.npmjs.org/');
      }
    }

    if (publishGithub) {
      if (!checkGitHubToken()) {
        console.error('❌ Please set a valid GITHUB_TOKEN or configure .npmrc correctly.');
        process.exit(1);
      }
      if (await confirmPublish('GitHub Packages')) {
        const scopedName = '${githubPackageName}';
        publishVariant(scopedName, 'https://npm.pkg.github.com/');
      }
    }

    // Restore original package.json
    fs.writeFileSync('package.json', originalPackageJson);
    console.log('\\n🔄 package.json restored to original state.');
  } catch (err) {
    console.error('❌ Publishing failed:', err.message);
    fs.writeFileSync('package.json', originalPackageJson);
    console.log('\\n🔄 package.json restored to original state.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error('💡 Check your network connection, authentication credentials, or file permissions.');
  process.exit(1);
});
`;
}

function generateNpmrc(githubUsername, githubToken) {
  if (!githubUsername || !githubToken || githubToken.toLowerCase() === "na")
    return "";
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

  return `# ${packageName}

${answers.description || "A new Node.js package"}

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

Add your usage instructions here.

## Publishing

Run \`npm run publish\` to publish to ${
    publishTo === "Both"
      ? "npmjs.org and GitHub Packages"
      : publishTo === "npmjs"
      ? "npmjs.org"
      : "GitHub Packages"
  }.
Use \`npm run publish:minor\` or \`:major\` for minor or major version bumps.

## Testing

Run \`npm test\` to execute the test suite using Jest.

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
  } else if (license === "Apache-2.0") {
    return `Apache License, Version 2.0

Copyright (c) ${year} ${authorName}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
`;
  } else if (license === "GPL-3.0") {
    return `GNU General Public License, Version 3.0

Copyright (c) ${year} ${authorName}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
`;
  } else if (license === "Unlicense") {
    return `The Unlicense

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
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
coverage/
`;
}

function generateTestFile() {
  return `const { hello } = require('../index');

describe('Package Functionality', () => {
  test('hello function logs Hello World', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    hello();
    expect(consoleLogSpy).toHaveBeenCalledWith('Hello World!');
    consoleLogSpy.mockRestore();
  });
});
`;
}

function generateGitHubWorkflow(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const npmjsPublish =
    answers.publishTo === "npmjs" || answers.publishTo === "Both";
  const githubPublish = isGitHub;

  return `name: Publish Package

on:
  push:
    branches:
      - main

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        token: \${{ secrets.GITHUB_TOKEN }}

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        registry-url: ${
          isGitHub
            ? "'https://npm.pkg.github.com/'"
            : "'https://registry.npmjs.org/'"
        }

    - name: Install dependencies
      run: npm install

    - name: Determine version bump
      id: version
      run: |
        COMMIT_MESSAGE=$(git log -1 --pretty=%B)
        if [[ "$COMMIT_MESSAGE" =~ "major" ]]; then
          echo "version_type=major" >> $GITHUB_OUTPUT
        elif [[ "$COMMIT_MESSAGE" =~ "minor" ]]; then
          echo "version_type=minor" >> $GITHUB_OUTPUT
        else
          echo "version_type=patch" >> $GITHUB_OUTPUT
        fi

    - name: Bump version
      run: |
        node node_modules/build-a-npm/publish.js --${"${{ steps.version.outputs.version_type }}"} --npmjs ${
    isGitHub ? "--github" : ""
  }

    - name: Commit and push version bump
      run: |
        git config user.name "GitHub Actions"
        git config user.email "actions@github.com"
        git add package.json
        git commit -m "Bump version to $(node -p -e "require('./package.json').version")"
        git push

    - name: Publish to npmjs
      if: ${npmjsPublish}
      run: npm publish
      env:
        NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}

    - name: Publish to GitHub Packages
      if: ${githubPublish}
      run: npm publish
      env:
        NODE_AUTH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
}

async function init(noGit) {
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

    // Prompt for package details
    const answers = await promptPackageDetails();

    // Generate package.json
    const packageJsonContent = generatePackageJson(answers);
    fs.writeFileSync("package.json", packageJsonContent);
    console.log(colorize("✅ Generated package.json", "32"));

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
    console.log(
      colorize("✅ Generated publish.js in node_modules/build-a-npm", "32")
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

    // Generate test file
    const testDir = path.join("test");
    fs.mkdirSync(testDir, { recursive: true });
    const testContent = generateTestFile();
    fs.writeFileSync(path.join(testDir, "index.test.js"), testContent);
    console.log(colorize("✅ Generated test/index.test.js", "32"));

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
    console.log(colorize("5. Run `npm test` to run tests", "36"));
    console.log(
      colorize(`6. Run \`npm run publish\` to publish your package`, "36")
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

async function main() {
  const args = process.argv.slice(2);
  const noGit = args.includes("--no-git");
  if (args.includes("init")) {
    await init(noGit);
  } else {
    console.log(colorize("Usage: npx build-a-npm init [--no-git]", "36"));
    console.log(
      colorize('Run "build-a-npm init" to create a new Node package.', "36")
    );
    console.log(
      colorize("Use --no-git to skip git repository initialization.", "36")
    );
    process.exit(1);
  }
}

// Run the main function
main().catch((err) => {
  console.error(colorize("❌ Error:", "31"), err.message);
  console.error(
    colorize(
      "💡 Check your file permissions, network connection, or try running the command again.",
      "33"
    )
  );
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
  generateTestFile,
  generateGitHubWorkflow,
};
