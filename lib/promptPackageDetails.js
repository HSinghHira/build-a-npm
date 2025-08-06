const {
  getInquirer,
  fs,
  logger,
  fetchNpmPackage,
  createGitHubRepo,
} = require('./utils');
const { Octokit } = require('@octokit/rest');

async function promptPackageDetails(config = {}) {
  const inquirer = await getInquirer();
  if (!inquirer || !inquirer.prompt) {
    logger.error('Failed to initialize inquirer module');
    throw new Error(
      'Failed to initialize inquirer module. Please ensure @inquirer/prompts is installed correctly.'
    );
  }

  logger.debug('Config passed to promptPackageDetails:', config);

  const dependencyList = [];

  const questions = [
    {
      type: 'list',
      name: 'useNewDir',
      message: 'Create a new directory for your project?',
      choices: ['Yes, same as my Package Name', 'Yes, a Custom Name', 'No'],
      default: config.useNewDir || 'Yes, same as my Package Name',
    },
    {
      type: 'input',
      name: 'projectDir',
      message: 'Enter the new directory name:',
      default: config.projectDir,
      when: answers => answers.useNewDir === 'Yes, a Custom Name',
      validate: input => {
        if (input.trim() === '') return 'Directory name is required';
        if (fs.existsSync(input)) return 'Directory already exists';
        if (!/^[a-z0-9-._]+$/.test(input))
          return 'Directory name must contain only lowercase letters, numbers, hyphens, periods, or underscores';
        return true;
      },
    },
    {
      type: 'list',
      name: 'useMonorepo',
      message: 'Is this package part of a monorepo?',
      choices: ['Yes', 'No'],
      default: config.useMonorepo ? 'Yes' : 'No',
    },
    {
      type: 'input',
      name: 'monorepoRoot',
      message:
        'Enter the monorepo root directory (relative to current directory):',
      default: config.monorepoRoot || '.',
      when: answers => answers.useMonorepo === 'Yes',
      validate: input => {
        if (input.trim() === '') return 'Monorepo root directory is required';
        return true;
      },
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Choose a package manager for the monorepo:',
      choices: ['npm', 'pnpm', 'yarn'],
      default: config.packageManager || 'npm',
      when: answers => answers.useMonorepo === 'Yes',
    },
    {
      type: 'list',
      name: 'publishTo',
      message: 'Where do you want to publish your package?',
      choices: ['npmjs', 'GitHub Packages', 'Both', 'Custom', 'All'],
      default: config.publishTo || 'Both',
    },
    {
      type: 'input',
      name: 'customRegistryUrl',
      message:
        'Enter the custom registry URL (e.g., https://npm.cloudsmith.io/org/repo/, or "NA" to skip):',
      default: config.customRegistryUrl || 'NA',
      when: answers => ['Custom', 'All'].includes(answers.publishTo),
      validate: input => {
        if (input.toLowerCase() === 'na') return true;
        if (input.trim() === '') return 'Custom registry URL is required';
        if (!/^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/.+$/.test(input))
          return 'Please enter a valid URL (e.g., https://npm.cloudsmith.io/org/repo/)';
        return true;
      },
    },
    {
      type: 'input',
      name: 'artifactoryUrl',
      message: 'Enter the Artifactory registry URL (or "NA" to skip):',
      default: config.artifactoryUrl || 'NA',
      when: answers => answers.publishTo === 'All',
      validate: input => {
        if (input.toLowerCase() === 'na') return true;
        if (input.trim() === '') return 'Artifactory registry URL is required';
        if (!/^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/.+$/.test(input))
          return 'Please enter a valid URL (e.g., https://your-artifactory-domain/artifactory/api/npm/npm-repo/)';
        return true;
      },
    },
    {
      type: 'input',
      name: 'nexusUrl',
      message: 'Enter the Nexus registry URL (or "NA" to skip):',
      default: config.nexusUrl || 'NA',
      when: answers => answers.publishTo === 'All',
      validate: input => {
        if (input.toLowerCase() === 'na') return true;
        if (input.trim() === '') return 'Nexus registry URL is required';
        if (!/^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/.+$/.test(input))
          return 'Please enter a valid URL (e.g., https://your-nexus-domain/repository/npm-public/)';
        return true;
      },
    },
    {
      type: 'input',
      name: 'verdaccioUrl',
      message: 'Enter the Verdaccio registry URL (or "NA" to skip):',
      default: config.verdaccioUrl || 'NA',
      when: answers => answers.publishTo === 'All',
      validate: input => {
        if (input.toLowerCase() === 'na') return true;
        if (input.trim() === '') return 'Verdaccio registry URL is required';
        if (!/^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/.+$/.test(input))
          return 'Please enter a valid URL (e.g., http://your-verdaccio-host:4873/)';
        return true;
      },
    },
    {
      type: 'input',
      name: 'customRegistryToken',
      message:
        'Enter the authentication token for the custom registry (or "NA" to skip):',
      default: config.customRegistryToken || 'NA',
      when: answers => ['Custom', 'All'].includes(answers.publishTo),
    },
    {
      type: 'input',
      name: 'artifactoryToken',
      message:
        'Enter the authentication token for Artifactory (or "NA" to skip):',
      default: config.artifactoryToken || 'NA',
      when: answers =>
        answers.publishTo === 'All' &&
        answers.artifactoryUrl.toLowerCase() !== 'na',
    },
    {
      type: 'input',
      name: 'nexusToken',
      message: 'Enter the authentication token for Nexus (or "NA" to skip):',
      default: config.nexusToken || 'NA',
      when: answers =>
        answers.publishTo === 'All' && answers.nexusUrl.toLowerCase() !== 'na',
    },
    {
      type: 'input',
      name: 'verdaccioToken',
      message:
        'Enter the authentication token for Verdaccio (or "NA" to skip):',
      default: config.verdaccioToken || 'NA',
      when: answers =>
        answers.publishTo === 'All' &&
        answers.verdaccioUrl.toLowerCase() !== 'na',
    },
    {
      type: 'list',
      name: 'access',
      message: 'Package access level:',
      choices: ['public', 'private'],
      default: config.access || 'public',
    },
    {
      type: 'list',
      name: 'createGitHubWorkflow',
      message: 'Create a GitHub Actions workflow file (publish.yml)?',
      choices: ['Yes', 'No'],
      default:
        config.createGitHubWorkflow !== undefined
          ? config.createGitHubWorkflow
            ? 'Yes'
            : 'No'
          : 'Yes',
      when: answers =>
        ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo),
    },
    {
      type: 'list',
      name: 'createGitHubRepo',
      message: 'Create a GitHub repository automatically?',
      choices: ['Yes', 'No'],
      default: config.createGitHubRepo ? 'Yes' : 'No',
      when: answers =>
        ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo),
    },
    {
      type: 'list',
      name: 'createGitHubPages',
      message: 'Do you want to Publish a Documentation on GitHub Pages?',
      choices: ['Yes', 'No'],
      default: config.createGitHubPages ? 'Yes' : 'No',
    },
    {
      type: 'list',
      name: 'ciProvider',
      message: 'Choose a CI/CD provider for workflows:',
      choices: ['GitHub Actions', 'GitLab CI', 'CircleCI', 'None'],
      default: config.ciProvider || 'GitHub Actions',
    },
    {
      type: 'input',
      name: 'githubUsername',
      message: 'Enter your GitHub username:',
      default: config.githubUsername,
      when: answers =>
        ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo) ||
        answers.createGitHubPages === 'Yes',
      validate: input =>
        input.trim() !== '' ? true : 'GitHub username is required',
      filter: input => input.toLowerCase(),
    },
    {
      type: 'input',
      name: 'name',
      message: 'Enter your Package Name',
      default: config && config.name ? config.name : undefined,
      validate: async (input, answers = {}) => {
        logger.debug('Validating package name:', { input, answers });
        if (input.trim() === '') return 'Package name is required';
        if (input.length > 214)
          return 'Package name must be 214 characters or less';

        const reservedNames = ['node', 'npm', 'http', 'https', 'core', 'js'];
        const namePart = input.startsWith('@') ? input.split('/')[1] : input;
        if (reservedNames.includes(namePart))
          return `Package name "${namePart}" is reserved by npm`;

        // For npmjs or Custom, allow non-scoped or scoped packages
        if (['npmjs', 'Custom'].includes(answers.publishTo)) {
          if (input.startsWith('@')) {
            if (
              !/^@[a-z0-9-][a-z0-9-]{0,49}\/[a-z0-9][a-z0-9-]{0,49}$/.test(
                input
              )
            )
              return 'Scoped package must be in the format @scope/package, with scope and package name containing only lowercase letters, numbers, or hyphens (e.g., @myscope/my-package)';
          } else if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(input)) {
            return 'Package name must start with a lowercase letter or number, followed by lowercase letters, numbers, or hyphens (e.g., my-package)';
          }
          const exists = await fetchNpmPackage(input);
          if (exists) {
            logger.warn(`Package ${input} already exists on npm`);
            return `Warning: Package ${input} already exists on npm. Ensure you have permission to publish it.`;
          }
          return true;
        }

        // For GitHub Packages, require scoped package with @githubUsername
        if (answers.publishTo === 'GitHub Packages' && answers.githubUsername) {
          if (!input.startsWith(`@${answers.githubUsername}/`)) {
            return `GitHub Packages requires scoped packages in the format @${answers.githubUsername}/package (e.g., @${answers.githubUsername}/my-package)`;
          }
          if (
            !/^@[a-z0-9-][a-z0-9-]{0,49}\/[a-z0-9][a-z0-9-]{0,49}$/.test(input)
          ) {
            return 'Scoped package must be in the format @scope/package, with scope and package name containing only lowercase letters, numbers, or hyphens (e.g., @myscope/my-package)';
          }
          return true;
        }

        // For Both or All, allow non-scoped or scoped packages
        if (['Both', 'All'].includes(answers.publishTo)) {
          if (input.startsWith('@')) {
            if (
              !/^@[a-z0-9-][a-z0-9-]{0,49}\/[a-z0-9][a-z0-9-]{0,49}$/.test(
                input
              )
            ) {
              return 'Scoped package must be in the format @scope/package, with scope and package name containing only lowercase letters, numbers, or hyphens (e.g., @myscope/my-package)';
            }
            if (
              answers.githubUsername &&
              input.split('/')[0] !== `@${answers.githubUsername}`
            ) {
              return `For GitHub Packages, scoped package must start with @${answers.githubUsername} (e.g., @${answers.githubUsername}/my-package)`;
            }
          } else if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(input)) {
            return 'Package name must start with a lowercase letter or number, followed by lowercase letters, numbers, or hyphens (e.g., my-package)';
          }
          const exists = await fetchNpmPackage(input);
          if (exists) {
            logger.warn(`Package ${input} already exists on npm`);
            return `Warning: Package ${input} already exists on npm. Ensure you have permission to publish it.`;
          }
          return true;
        }

        return true;
      },
      when: answers => !answers.name,
    },
    {
      type: 'input',
      name: 'githubRepoName',
      message: 'Enter your GitHub repository name:',
      default: answers => (config && config.githubRepoName) || answers.name,
      when: answers =>
        ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo) ||
        answers.createGitHubPages === 'Yes',
      validate: input =>
        input.trim() !== '' ? true : 'GitHub repository name is required',
    },
    {
      type: 'input',
      name: 'githubRepoToken',
      message:
        "Enter your GitHub Classic Personal Access Token with 'repo' scope for GitHub Packages or repository creation (or 'NA' to skip):",
      default: config && config.githubRepoToken ? config.githubRepoToken : 'NA',
      when: answers =>
        ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo) ||
        answers.createGitHubRepo === 'Yes',
      validate: async (input, answers) => {
        input = input.trim();
        if (input.toLowerCase() === 'na') return true;
        if (input === '')
          return "GitHub classic token is required (or enter 'NA' to skip)";
        if (!/^(ghp_|ghf_)[A-Za-z0-9_]{36}$/.test(input))
          return "Invalid GitHub classic token format. It should start with 'ghp_' or 'ghf_' and be 40 characters long. Create a classic token at https://github.com/settings/tokens.";
        try {
          const octokit = new Octokit({ auth: input });
          const { data } = await octokit.users.getAuthenticated();
          logger.debug(`Authenticated as ${data.login}`);
          const scopes = await octokit.request('HEAD /');
          const tokenScopes =
            scopes.headers['x-oauth-scopes']?.split(', ') || [];
          if (!tokenScopes.includes('repo')) {
            return "GitHub classic token must have 'repo' scope. Create a token at https://github.com/settings/tokens with 'repo' permission.";
          }
          return true;
        } catch (err) {
          logger.warn(`GitHub classic token validation failed: ${err.message}`);
          return "Invalid GitHub classic token. Ensure it has 'repo' permission or enter 'NA' to skip. Create a token at https://github.com/settings/tokens.";
        }
      },
    },
    {
      type: 'input',
      name: 'githubPagesToken',
      message:
        "Enter your GitHub Fine-grained Personal Access Token with 'pages:write' scope for GitHub Pages (or 'NA' to skip):",
      default:
        config && config.githubPagesToken ? config.githubPagesToken : 'NA',
      when: answers => answers.createGitHubPages === 'Yes',
      validate: async (input, answers) => {
        input = input.trim();
        if (input.toLowerCase() === 'na') return true;
        if (input === '')
          return "GitHub fine-grained token is required (or enter 'NA' to skip)";
        if (!/^github_pat_[A-Za-z0-9_]{80,}$/.test(input))
          return "Invalid GitHub fine-grained token format. It should start with 'github_pat_' and be at least 84 characters long. Create a fine-grained token at https://github.com/settings/tokens?type=beta.";
        try {
          const octokit = new Octokit({ auth: input });
          const { data } = await octokit.users.getAuthenticated();
          logger.debug(`Authenticated as ${data.login}`);
          return true;
        } catch (err) {
          logger.warn(
            `GitHub fine-grained token validation failed: ${err.message}`
          );
          return "Invalid GitHub fine-grained token. Ensure it has 'pages:write' permission for the repository or enter 'NA' to skip. Create a token at https://github.com/settings/tokens?type=beta.";
        }
      },
    },
    {
      type: 'list',
      name: 'version',
      message: 'Select initial version:',
      choices: ['0.0.1 (Recommended)', '0.1.0', '1.0.0', 'Custom'],
      default: config.version || '0.0.1 (Recommended)',
    },
    {
      type: 'input',
      name: 'customVersion',
      message: 'Enter custom version (e.g., 1.0.0):',
      when: answers => answers.version === 'Custom',
      validate: input => {
        if (!/^\d+\.\d+\.\d+$/.test(input))
          return 'Version must be in the format x.y.z (e.g., 1.0.0)';
        return true;
      },
    },
    {
      type: 'list',
      name: 'moduleType',
      message: 'Choose module type:',
      choices: ['ES Modules', 'CommonJS'],
      default: config.moduleType || 'CommonJS',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter package description:',
      default: config.description,
    },
    {
      type: 'input',
      name: 'authorName',
      message: 'Enter author name:',
      default: config.authorName,
    },
    {
      type: 'input',
      name: 'authorEmail',
      message: 'Enter author email:',
      default: config.authorEmail,
      validate: input => {
        if (!input) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input)
          ? true
          : 'Please enter a valid email address';
      },
    },
    {
      type: 'input',
      name: 'authorUrl',
      message: 'Enter author URL:',
      default: config.authorUrl,
      filter: input => {
        if (!input) return input;
        return input.match(/^https?:\/\//) ? input : `https://${input}`;
      },
    },
    {
      type: 'input',
      name: 'homepage',
      message: 'Enter homepage URL:',
      default: config.homepage,
      when: answers => answers.createGitHubPages !== 'Yes',
      filter: input => {
        if (!input) return input;
        return input.match(/^https?:\/\//) ? input : `https://${input}`;
      },
    },
    {
      type: 'input',
      name: 'keywords',
      message: 'Enter keywords (comma-separated):',
      default: config.keywords ? config.keywords.join(', ') : '',
      filter: input =>
        input
          .split(',')
          .map(k => k.trim())
          .filter(k => k),
    },
    {
      type: 'list',
      name: 'license',
      message: 'Choose a license:',
      choices: ['MIT', 'ISC', 'Apache-2.0', 'GPL-3.0', 'Unlicense'],
      default: config.license || 'MIT',
    },
    {
      type: 'list',
      name: 'useTypeScript',
      message: 'Use TypeScript for your project?',
      choices: ['Yes', 'No'],
      default: config.useTypeScript ? 'Yes' : 'No',
    },
    {
      type: 'list',
      name: 'useESLint',
      message: 'Add ESLint for linting?',
      choices: ['Yes', 'No'],
      default: config.useESLint ? 'Yes' : 'No',
    },
    {
      type: 'list',
      name: 'usePrettier',
      message: 'Add Prettier for code formatting?',
      choices: ['Yes', 'No'],
      default: config.usePrettier ? 'Yes' : 'No',
    },
    {
      type: 'list',
      name: 'testFramework',
      message: 'Choose a testing framework:',
      choices: ['Jest', 'Mocha', 'Vitest', 'None'],
      default: config.testFramework || 'None',
    },
    {
      type: 'list',
      name: 'addDependency',
      message: 'Add a dependency to your project?',
      choices: ['Yes', 'No'],
      default: 'No',
    },
    {
      type: 'input',
      name: 'dependencyName',
      message: 'Enter dependency name (e.g., lodash):',
      when: answers => answers.addDependency === 'Yes',
      validate: async input => {
        if (input.trim() === '') return 'Dependency name is required';
        const valid = await fetchNpmPackage(input);
        if (!valid) return `Package "${input}" not found in npm registry`;
        return true;
      },
    },
    {
      type: 'input',
      name: 'dependencyVersion',
      message:
        "Enter dependency version (e.g., ^4.17.21, or 'latest' to skip):",
      default: 'latest',
      when: answers => answers.addDependency === 'Yes',
    },
    {
      type: 'list',
      name: 'addAnotherDependency',
      message: 'Add another dependency?',
      choices: ['Yes', 'No'],
      default: 'No',
      when: answers => answers.addDependency === 'Yes',
      loop: true,
    },
    {
      type: 'list',
      name: 'addDevDependency',
      message: 'Add a devDependency to your project?',
      choices: ['Yes', 'No'],
      default: 'No',
    },
    {
      type: 'input',
      name: 'devDependencyName',
      message: 'Enter devDependency name (e.g., eslint):',
      when: answers => answers.addDevDependency === 'Yes',
      validate: async input => {
        if (input.trim() === '') return 'DevDependency name is required';
        const valid = await fetchNpmPackage(input);
        if (!valid) return `Package "${input}" not found in npm registry`;
        return true;
      },
    },
    {
      type: 'input',
      name: 'devDependencyVersion',
      message:
        "Enter devDependency version (e.g., ^8.0.0, or 'latest' to skip):",
      default: 'latest',
      when: answers => answers.addDevDependency === 'Yes',
    },
    {
      type: 'list',
      name: 'addAnotherDevDependency',
      message: 'Add another devDependency?',
      choices: ['Yes', 'No'],
      default: 'No',
      when: answers => answers.addDevDependency === 'Yes',
      loop: true,
    },
    {
      type: 'list',
      name: 'addCustomScripts',
      message: 'Do you want to add custom npm scripts?',
      choices: ['Yes', 'No'],
      default: 'No',
    },
    {
      type: 'input',
      name: 'customScripts',
      message: 'Enter custom npm scripts (e.g., lint:eslint ., test:jest):',
      when: answers => answers.addCustomScripts === 'Yes',
      default:
        config && config.customScripts
          ? Object.entries(config.customScripts)
              .map(([k, v]) => `${k}:${v}`)
              .join(', ')
          : '',
      filter: input => {
        if (!input) return {};
        const scripts = {};
        input.split(',').forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) scripts[key] = value;
        });
        return scripts;
      },
    },
  ];

  const answers = await inquirer.prompt(questions);

  while (
    answers.addDependency === 'Yes' &&
    answers.addAnotherDependency === 'Yes'
  ) {
    const depAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'dependencyName',
        message: 'Enter dependency name (e.g., lodash):',
        validate: async input => {
          if (input.trim() === '') return 'Dependency name is required';
          const valid = await fetchNpmPackage(input);
          if (!valid) return `Package "${input}" not found in npm registry`;
          return true;
        },
      },
      {
        type: 'input',
        name: 'dependencyVersion',
        message:
          "Enter dependency version (e.g., ^4.17.21, or 'latest' to skip):",
        default: 'latest',
      },
      {
        type: 'list',
        name: 'addAnotherDependency',
        message: 'Add another dependency?',
        choices: ['Yes', 'No'],
        default: 'No',
      },
    ]);
    dependencyList.push({
      name: depAnswers.dependencyName,
      version: depAnswers.dependencyVersion,
      type: 'dependency',
    });
    answers.addAnotherDependency = depAnswers.addAnotherDependency;
  }
  if (answers.addDependency === 'Yes') {
    dependencyList.push({
      name: answers.dependencyName,
      version: answers.dependencyVersion,
      type: 'dependency',
    });
  }

  while (
    answers.addDevDependency === 'Yes' &&
    answers.addAnotherDevDependency === 'Yes'
  ) {
    const devDepAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'devDependencyName',
        message: 'Enter devDependency name (e.g., eslint):',
        validate: async input => {
          if (input.trim() === '') return 'DevDependency name is required';
          const valid = await fetchNpmPackage(input);
          if (!valid) return `Package "${input}" not found in npm registry`;
          return true;
        },
      },
      {
        type: 'input',
        name: 'devDependencyVersion',
        message:
          "Enter devDependency version (e.g., ^8.0.0, or 'latest' to skip):",
        default: 'latest',
      },
      {
        type: 'list',
        name: 'addAnotherDevDependency',
        message: 'Add another devDependency?',
        choices: ['Yes', 'No'],
        default: 'No',
      },
    ]);
    dependencyList.push({
      name: devDepAnswers.devDependencyName,
      version: devDepAnswers.devDependencyVersion,
      type: 'devDependency',
    });
    answers.addAnotherDevDependency = devDepAnswers.addAnotherDevDependency;
  }
  if (answers.addDevDependency === 'Yes') {
    dependencyList.push({
      name: answers.devDependencyName,
      version: answers.devDependencyVersion,
      type: 'devDependency',
    });
  }

  answers.version =
    answers.version === 'Custom'
      ? answers.customVersion
      : answers.version.split(' ')[0];
  answers.dependencies = dependencyList
    .filter(dep => dep.type === 'dependency')
    .reduce((acc, dep) => {
      acc[dep.name] = dep.version;
      return acc;
    }, {});
  answers.devDependencies = dependencyList
    .filter(dep => dep.type === 'devDependency')
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

  logger.debug('Final answers:', answers);
  return answers;
}

module.exports = { promptPackageDetails };
