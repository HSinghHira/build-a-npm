const inquirer = require('inquirer');
const fs = require('fs');
const { execSync } = require('child_process');

async function promptPackageDetails() {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Enter package name (e.g., my-package or @scope/my-package):',
      validate: input => input.trim() !== '' ? true : 'Package name is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter package description:'
    },
    {
      type: 'input',
      name: 'authorName',
      message: 'Enter author name:'
    },
    {
      type: 'input',
      name: 'authorEmail',
      message: 'Enter author email:'
    },
    {
      type: 'input',
      name: 'authorUrl',
      message: 'Enter author URL:'
    },
    {
      type: 'input',
      name: 'repositoryUrl',
      message: 'Enter repository URL (e.g., https://github.com/user/repo.git):'
    },
    {
      type: 'input',
      name: 'homepage',
      message: 'Enter homepage URL:'
    },
    {
      type: 'input',
      name: 'keywords',
      message: 'Enter keywords (comma-separated):',
      filter: input => input.split(',').map(k => k.trim()).filter(k => k)
    },
    {
      type: 'list',
      name: 'license',
      message: 'Choose a license:',
      choices: ['MIT', 'ISC', 'Apache-2.0', 'GPL-3.0', 'Unlicense'],
      default: 'MIT'
    }
  ];

  return inquirer.prompt(questions);
}

function generatePackageJson(answers) {
  const packageJson = {
    name: answers.name,
    version: '0.0.1',
    author: {
      name: answers.authorName,
      email: answers.authorEmail,
      url: answers.authorUrl
    },
    description: answers.description,
    main: 'index.js',
    license: answers.license,
    repository: {
      type: 'git',
      url: `git+${answers.repositoryUrl}`
    },
    bugs: {
      url: `${answers.repositoryUrl.replace('.git', '')}/issues`
    },
    homepage: answers.homepage,
    keywords: answers.keywords,
    scripts: {
      publish: "node publish.js && git add -A && git commit -m 'Update' && git push"
    },
    dependencies: {},
    devDependencies: {},
    publishConfig: {
      registry: "https://npm.pkg.github.com/",
      access: "public"
    }
  };

  return JSON.stringify(packageJson, null, 2);
}

function generatePublishScript() {
  return `const fs = require('fs');
const { execSync } = require('child_process');

function bumpVersion(version) {
  const parts = version.split('.').map(Number);
  parts[2] += 1; // Increment patch version
  return parts.join('.');
}

const originalPackageJson = fs.readFileSync('package.json', 'utf-8');
const originalPkg = JSON.parse(originalPackageJson);
const newVersion = bumpVersion(originalPkg.version);

// Update package.json with new version
const updatedPkg = { ...originalPkg, version: newVersion };
fs.writeFileSync('package.json', JSON.stringify(updatedPkg, null, 2));
console.log(\`\n🚀 Bumped version from \${originalPkg.version} to \${newVersion}\`);

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
  console.log(\`\n📦 Publishing \${name}@\${newVersion} to \${registry}\`);

  try {
    execSync(\`npm publish --registry=\${registry}\`, { stdio: 'inherit' });
    console.log(\`✅ Published \${name}@\${newVersion} to \${registry}\`);
  } catch (err) {
    console.error(\`❌ Failed to publish \${name}:\`, err.message);
  }
}

async function confirmPublish() {
  const { confirm } = await require('inquirer').prompt([
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
    // Restore original package.json
    fs.writeFileSync('package.json', originalPackageJson);
    return;
  }

  // Publish unscoped to npmjs
  publishVariant(originalPkg.name, 'https://registry.npmjs.org/');

  // Publish scoped to GitHub Packages
  const scopedName = originalPkg.name.startsWith('@') 
    ? originalPkg.name 
    : \`@owner/\${originalPkg.name}\`;
  publishVariant(scopedName, 'https://npm.pkg.github.com/');

  // Restore original package.json
  fs.writeFileSync('package.json', originalPackageJson);
  console.log('\n🔄 package.json restored to original state.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
`;
}

function generateNpmrc() {
  return `//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}
@owner:registry=https://npm.pkg.github.com/`;
}

async function main() {
  try {
    console.log('Welcome to build-a-npm! Let’s create your Node package.\n');

    // Prompt for package details
    const answers = await promptPackageDetails();

    // Generate package.json
    const packageJsonContent = generatePackageJson(answers);
    fs.writeFileSync('package.json', packageJsonContent);
    console.log('✅ Generated package.json');

    // Generate publish.js
    const publishScriptContent = generatePublishScript();
    fs.writeFileSync('publish.js', publishScriptContent);
    console.log('✅ Generated publish.js');

    // Generate .npmrc
    const npmrcContent = generateNpmrc();
    fs.writeFileSync('.npmrc', npmrcContent);
    console.log('✅ Generated .npmrc');

    // Initialize git repository if not exists
    if (!fs.existsSync('.git')) {
      execSync('git init', { stdio: 'inherit' });
      console.log('✅ Initialized git repository');
    }

    console.log('\n🎉 Package setup complete!');
    console.log('To publish your package, run: npm run publish');
    console.log('This will bump the version, publish to registries, and push to your repository.');
    console.log('Note: Ensure GITHUB_TOKEN is set in your environment for GitHub Packages.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

if (process.argv[2] === 'publish') {
  // If called with 'publish' argument, run the publish script
  require('./publish.js');
} else {
  main();
}

module.exports = { promptPackageDetails, generatePackageJson, generatePublishScript, generateNpmrc };