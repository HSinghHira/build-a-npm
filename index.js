#!/usr/bin/env node

const fs = require("fs");
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
      type: "input",
      name: "name",
      message: "Enter package name (e.g., my-package or @scope/my-package):",
      validate: (input) =>
        input.trim() !== "" ? true : "Package name is required",
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
      name: "repositoryUrl",
      message: "Enter repository URL (e.g., https://github.com/user/repo.git):",
      validate: (input) => {
        if (!input.trim()) return "Repository URL is required";
        return true;
      },
    },
    {
      type: "input",
      name: "homepage",
      message: "Enter homepage URL:",
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
  const repositoryUrl = answers.repositoryUrl.endsWith(".git")
    ? answers.repositoryUrl
    : answers.repositoryUrl + ".git";

  const bugsUrl = repositoryUrl.replace(".git", "") + "/issues";

  const packageJson = {
    name: answers.name,
    version: "0.0.1",
    author: {
      name: answers.authorName,
      email: answers.authorEmail,
      url: answers.authorUrl,
    },
    description: answers.description,
    main: "index.js",
    license: answers.license,
    repository: {
      type: "git",
      url: `git+${repositoryUrl}`,
    },
    bugs: {
      url: bugsUrl,
    },
    homepage: answers.homepage,
    keywords: answers.keywords,
    scripts: {
      publish:
        "node publish.js && git add -A && git commit -m 'Update' && git push",
    },
    dependencies: {},
    devDependencies: {},
    publishConfig: {
      registry: "https://npm.pkg.github.com/",
      access: "public",
    },
  };

  // Remove empty fields to keep package.json clean
  if (!packageJson.author.email) delete packageJson.author.email;
  if (!packageJson.author.url) delete packageJson.author.url;
  if (!packageJson.description) delete packageJson.description;
  if (!packageJson.homepage) delete packageJson.homepage;
  if (!packageJson.keywords.length) delete packageJson.keywords;

  return JSON.stringify(packageJson, null, 2);
}

function generatePublishScript(packageName, repositoryUrl) {
  const repoMatch = repositoryUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
  const owner = repoMatch ? repoMatch[1] : "owner";

  return `const fs = require('fs');
const { execSync } = require('child_process');

async function getInquirer() {
  const inquirer = await import('inquirer');
  return inquirer.default;
}

function bumpVersion(version) {
  const parts = version.split('.').map(Number);
  parts[2] += 1; // Increment patch version
  return parts.join('.');
}

const originalPackageJson = fs.readFileSync('package.json', 'utf-8');
const originalPkg = JSON.parse(originalPackageJson);
const newVersion = bumpVersion(originalPkg.version);

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

async function confirmPublish() {
  const inquirer = await getInquirer();
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: \`Publish new version \${newVersion} to npmjs.com and GitHub Packages?\`,
      default: true
    }
  ]);
  return confirm;
}

async function main() {
  if (!(await confirmPublish())) {
    console.log('🚫 Publishing cancelled.');
    fs.writeFileSync('package.json', originalPackageJson);
    return;
  }

  publishVariant(originalPkg.name, 'https://registry.npmjs.org/');

  const scopedName = originalPkg.name.startsWith('@') 
    ? originalPkg.name 
    : \`@${owner}/\${originalPkg.name}\`;
  publishVariant(scopedName, 'https://npm.pkg.github.com/');

  fs.writeFileSync('package.json', originalPackageJson);
  console.log('\\n🔄 package.json restored to original state.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
`;
}

function generateNpmrc(repositoryUrl) {
  const repoMatch = repositoryUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
  const owner = repoMatch ? repoMatch[1] : "owner";

  return `//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}
@${owner}:registry=https://npm.pkg.github.com/`;
}

function generateIndexFile() {
  return `// Your package main file
console.log('Hello from your new npm package!');

module.exports = {
  hello: () => console.log('Hello World!')
};
`;
}

async function init() {
  try {
    console.log("🚀 Welcome to build-a-npm! Let's create your Node package.\n");

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

    const answers = await promptPackageDetails();

    fs.writeFileSync("package.json", generatePackageJson(answers));
    console.log("✅ Generated package.json");

    fs.writeFileSync(
      "publish.js",
      generatePublishScript(answers.name, answers.repositoryUrl)
    );
    console.log("✅ Generated publish.js");

    fs.writeFileSync(".npmrc", generateNpmrc(answers.repositoryUrl));
    console.log("✅ Generated .npmrc");

    if (!fs.existsSync("index.js")) {
      fs.writeFileSync("index.js", generateIndexFile());
      console.log("✅ Generated index.js");
    }

    if (!fs.existsSync(".git")) {
      try {
        execSync("git init", { stdio: "inherit" });
        console.log("✅ Initialized git repository");
      } catch (err) {
        console.log(
          "⚠️  Could not initialize git repository. You may need to do this manually."
        );
      }
    }

    if (!fs.existsSync(".gitignore")) {
      const gitignoreContent = `node_modules/
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
`;
      fs.writeFileSync(".gitignore", gitignoreContent);
      console.log("✅ Generated .gitignore");
    }

    console.log("\n🎉 Package setup complete!");
    console.log("\n📋 Next steps:");
    console.log(
      "1. Set your GITHUB_TOKEN environment variable for GitHub Packages"
    );
    console.log('2. Run "npm install" to install dependencies');
    console.log("3. Add your package code to index.js");
    console.log('4. Run "npm run publish" to publish your package');
    console.log("\n💡 The publish script will:");
    console.log("   - Automatically bump the patch version");
    console.log("   - Publish to both npmjs.org and GitHub Packages");
    console.log("   - Commit and push changes to your repository");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "init") {
    await init();
  } else {
    console.log("Usage: npx build-a-npm init");
    console.log('Run "build-a-npm init" to create a new Node package.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
