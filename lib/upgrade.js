const { init } = require('./init');
const {
  colorize,
  getInquirer,
  fs,
  path,
  logger,
  writeFile,
} = require('./utils');
const { generatePackageJson } = require('./generatePackageJson');
const { generateNpmrc } = require('./generateNpmrc');
const { generateGitignore } = require('./generateGitignore');
const { generateGitHubWorkflow } = require('./generateGitHubWorkflow');
const { generateGitLabWorkflow } = require('./generateGitLabWorkflow');
const { generateCircleCIWorkflow } = require('./generateCircleCIWorkflow');
const {
  generateGitHubPagesWorkflow,
} = require('./generateGitHubPagesWorkflow');
const { generateGitHubPagesIndex } = require('./generateGitHubPagesIndex');
const { generateTsConfig } = require('./generateTsConfig');
const { generateEslintConfig } = require('./generateEslintConfig');
const { generatePrettierConfig } = require('./generatePrettierConfig');
const { generateTestFile } = require('./generateTestFile');
const { generateNpmIgnore } = require('./generateNpmIgnore');
const { generateWebpage } = require('./generateWebpage');
const { generateNextSteps } = require('./generateNextSteps');
const { Octokit } = require('@octokit/rest');

async function upgrade(packageVersion, verbose, dryRun) {
  logger.setVerbose(verbose);
  logger.info(
    `Starting upgrade process (version: ${packageVersion}, dryRun: ${dryRun})`
  );

  try {
    const isWindows = process.platform === 'win32';
    logger.debug(`Current directory: ${process.cwd()}`);
    console.log(
      colorize(
        `🚀 Upgrading package with build-a-npm v${packageVersion}`,
        '36'
      ) + '\n'
    );

    if (!fs.existsSync('package.json')) {
      logger.error('No package.json found in the current directory');
      console.error(
        colorize('❌ No package.json found in the current directory.', '31')
      );
      console.log(
        colorize(
          '💡 Run this command in a directory with an existing package.json or use `npx build-a-npm init`.',
          '33'
        )
      );
      process.exit(1);
    }

    const existingPackageJson = JSON.parse(
      fs.readFileSync('package.json', 'utf-8')
    );
    logger.debug('Existing package.json:', existingPackageJson);

    if (!existingPackageJson.devDependencies?.['build-a-npm']) {
      logger.error('build-a-npm not found in devDependencies');
      console.error(
        colorize(
          '❌ This package does not use build-a-npm as a devDependency.',
          '31'
        )
      );
      console.log(
        colorize(
          '💡 Ensure `build-a-npm` is listed in devDependencies in package.json.',
          '33'
        )
      );
      process.exit(1);
    }

    const suggestions = {
      useTypeScript:
        !existingPackageJson.types &&
        !existingPackageJson.devDependencies?.typescript
          ? 'Add TypeScript support?'
          : null,
      useESLint: !existingPackageJson.devDependencies?.eslint
        ? 'Add ESLint for linting?'
        : null,
      usePrettier: !existingPackageJson.devDependencies?.prettier
        ? 'Add Prettier for code formatting?'
        : null,
      testFramework:
        !existingPackageJson.devDependencies?.jest &&
        !existingPackageJson.devDependencies?.mocha &&
        !existingPackageJson.devDependencies?.vitest
          ? 'Add a testing framework?'
          : null,
      moduleType: !existingPackageJson.type
        ? 'Specify module type (ES Modules or CommonJS)?'
        : null,
      ciProvider:
        !fs.existsSync('.github/workflows/publish.yml') &&
        !fs.existsSync('.gitlab-ci.yml') &&
        !fs.existsSync('.circleci/config.yml')
          ? 'Add a CI/CD workflow?'
          : null,
      createGitHubPages: !fs.existsSync('index.html')
        ? 'Publish WEBPAGE.md as documentation on GitHub Pages?'
        : null,
      publishTo: !existingPackageJson.publishConfig?.registry
        ? 'Update publishing registry?'
        : null,
    };
    const suggestionPrompts = Object.entries(suggestions)
      .filter(([_, message]) => message)
      .map(([key, message]) => ({
        type: 'list',
        name: key,
        message,
        choices:
          key === 'testFramework'
            ? ['Jest', 'Mocha', 'Vitest', 'No']
            : key === 'moduleType'
              ? ['ES Modules', 'CommonJS', 'No']
              : key === 'ciProvider'
                ? ['GitHub Actions', 'GitLab CI', 'CircleCI', 'No']
                : key === 'publishTo'
                  ? ['npmjs', 'GitHub Packages', 'Both', 'Custom', 'All', 'No']
                  : ['Yes', 'No'],
        default: 'No',
      }));

    const inquirer = await getInquirer();
    const promptQuestions = [
      {
        type: 'list',
        name: 'confirm',
        message:
          'Update this package with the latest build-a-npm features? This will modify package.json, add missing files, and update scripts.',
        choices: ['Yes', 'No'],
        default: 'Yes',
      },
      ...suggestionPrompts,
      {
        type: 'input',
        name: 'customRegistryUrl',
        message:
          'Enter the custom registry URL (e.g., https://npm.cloudsmith.io/org/repo/, or "NA" to skip):',
        default: existingPackageJson.publishConfig?.registry || 'NA',
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
        default: 'NA',
        when: answers => answers.publishTo === 'All',
        validate: input => {
          if (input.toLowerCase() === 'na') return true;
          if (input.trim() === '')
            return 'Artifactory registry URL is required';
          if (!/^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/.+$/.test(input))
            return 'Please enter a valid URL (e.g., https://your-artifactory-domain/artifactory/api/npm/npm-repo/)';
          return true;
        },
      },
      {
        type: 'input',
        name: 'nexusUrl',
        message: 'Enter the Nexus registry URL (or "NA" to skip):',
        default: 'NA',
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
        default: 'NA',
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
        default: 'NA',
        when: answers => ['Custom', 'All'].includes(answers.publishTo),
      },
      {
        type: 'input',
        name: 'artifactoryToken',
        message:
          'Enter the authentication token for Artifactory (or "NA" to skip):',
        default: 'NA',
        when: answers =>
          answers.publishTo === 'All' &&
          answers.artifactoryUrl &&
          answers.artifactoryUrl.toLowerCase() !== 'na',
      },
      {
        type: 'input',
        name: 'nexusToken',
        message: 'Enter the authentication token for Nexus (or "NA" to skip):',
        default: 'NA',
        when: answers =>
          answers.publishTo === 'All' &&
          answers.nexusUrl &&
          answers.nexusUrl.toLowerCase() !== 'na',
      },
      {
        type: 'input',
        name: 'verdaccioToken',
        message:
          'Enter the authentication token for Verdaccio (or "NA" to skip):',
        default: 'NA',
        when: answers =>
          answers.publishTo === 'All' &&
          answers.verdaccioUrl &&
          answers.verdaccioUrl.toLowerCase() !== 'na',
      },
      {
        type: 'list',
        name: 'createGitHubWorkflow',
        message: 'Create a GitHub Actions workflow file (publish.yml)?',
        choices: ['Yes', 'No'],
        default: 'Yes',
        when: answers =>
          answers.confirm === 'Yes' &&
          answers.ciProvider !== 'GitLab CI' &&
          answers.ciProvider !== 'CircleCI',
      },
      {
        type: 'input',
        name: 'githubUsername',
        message:
          'GitHub username or organization for GitHub Packages or Pages:',
        default:
          existingPackageJson.repository?.url?.split('/')[3] ||
          existingPackageJson.name?.split('/')[0]?.replace('@', '') ||
          'sampleuser',
        when: answers =>
          answers.createGitHubPages === 'Yes' ||
          ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo),
        validate: input =>
          input.trim() !== '' ? true : 'GitHub username is required',
        filter: input => input.toLowerCase(),
      },
      {
        type: 'input',
        name: 'githubRepoName',
        message: 'GitHub repository name for GitHub Packages or Pages:',
        default:
          existingPackageJson.repository?.url
            ?.split('/')
            .slice(-1)[0]
            ?.replace('.git', '') || existingPackageJson.name,
        when: answers =>
          answers.createGitHubPages === 'Yes' ||
          ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo),
        validate: input =>
          input.trim() !== '' ? true : 'GitHub repository name is required',
      },
      {
        type: 'input',
        name: 'githubRepoToken',
        message:
          "Enter your GitHub Classic Personal Access Token with 'repo' scope for GitHub Packages (or 'NA' to skip):",
        default: 'NA',
        when: answers =>
          ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo),
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
            logger.warn(
              `GitHub classic token validation failed: ${err.message}`
            );
            return "Invalid GitHub classic token. Ensure it has 'repo' permission or enter 'NA' to skip. Create a token at https://github.com/settings/tokens.";
          }
        },
      },
      {
        type: 'input',
        name: 'githubPagesToken',
        message:
          "Enter your GitHub Fine-grained Personal Access Token with 'pages:write' scope for GitHub Pages (or 'NA' to skip):",
        default: 'NA',
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
        name: 'access',
        message: 'Package access level:',
        choices: ['public', 'private'],
        default: existingPackageJson.publishConfig?.access || 'public',
        when: answers => answers.confirm === 'Yes',
      },
    ];
    const {
      confirm,
      createGitHubWorkflow,
      githubUsername,
      githubRepoName,
      githubRepoToken,
      githubPagesToken,
      access,
      useTypeScript,
      useESLint,
      usePrettier,
      testFramework,
      moduleType,
      ciProvider,
      createGitHubPages,
      publishTo,
      customRegistryUrl,
      artifactoryUrl,
      nexusUrl,
      verdaccioUrl,
      customRegistryToken,
      artifactoryToken,
      nexusToken,
      verdaccioToken,
    } = await inquirer.prompt(promptQuestions);

    if (confirm === 'No') {
      logger.info('Cancelled by user. No files modified.');
      console.log(colorize('⏹️ Cancelled. No files were modified.', '33'));
      return;
    }

    const isGitHub =
      ['GitHub Packages', 'Both', 'All'].includes(publishTo) ||
      existingPackageJson.publishConfig?.registry?.includes(
        'npm.pkg.github.com'
      ) ||
      existingPackageJson.repository?.url?.includes('github.com');
    const effectivePublishTo =
      publishTo !== 'No'
        ? publishTo
        : isGitHub
          ? existingPackageJson.publishConfig?.registry?.includes(
              'registry.npmjs.org'
            )
            ? 'Both'
            : 'GitHub Packages'
          : 'npmjs';

    const answers = {
      publishTo: effectivePublishTo,
      createGitHubWorkflow:
        createGitHubWorkflow !== undefined ? createGitHubWorkflow : 'No',
      createGitHubPages:
        createGitHubPages !== undefined ? createGitHubPages : 'No',
      useTypeScript:
        useTypeScript === 'Yes' || existingPackageJson.types ? 'Yes' : 'No',
      useESLint:
        useESLint === 'Yes' || existingPackageJson.devDependencies?.eslint
          ? 'Yes'
          : 'No',
      usePrettier:
        usePrettier === 'Yes' || existingPackageJson.devDependencies?.prettier
          ? 'Yes'
          : 'No',
      testFramework:
        testFramework !== 'No'
          ? testFramework
          : existingPackageJson.devDependencies?.jest
            ? 'Jest'
            : existingPackageJson.devDependencies?.mocha
              ? 'Mocha'
              : existingPackageJson.devDependencies?.vitest
                ? 'Vitest'
                : 'None',
      moduleType:
        moduleType !== 'No'
          ? moduleType
          : existingPackageJson.type === 'module'
            ? 'ES Modules'
            : 'CommonJS',
      ciProvider:
        ciProvider !== 'No'
          ? ciProvider
          : fs.existsSync('.github/workflows/publish.yml')
            ? 'GitHub Actions'
            : fs.existsSync('.gitlab-ci.yml')
              ? 'GitLab CI'
              : fs.existsSync('.circleci/config.yml')
                ? 'CircleCI'
                : 'None',
      access,
      name: existingPackageJson.name,
      version: existingPackageJson.version,
      githubUsername:
        githubUsername ||
        (isGitHub
          ? existingPackageJson.name.split('/')[0]?.replace('@', '') ||
            existingPackageJson.repository?.url?.split('/').slice(-2)[0] ||
            'sampleuser'
          : 'sampleuser'),
      githubRepoName:
        githubRepoName ||
        existingPackageJson.repository?.url
          ?.split('/')
          .slice(-1)[0]
          ?.replace('.git', '') ||
        existingPackageJson.name,
      githubRepoToken: githubRepoToken || 'NA',
      githubPagesToken: githubPagesToken || 'NA',
      customRegistryUrl: customRegistryUrl || 'NA',
      artifactoryUrl: artifactoryUrl || 'NA',
      nexusUrl: nexusUrl || 'NA',
      verdaccioUrl: verdaccioUrl || 'NA',
      customRegistryToken: customRegistryToken || 'NA',
      artifactoryToken: artifactoryToken || 'NA',
      nexusToken: nexusToken || 'NA',
      verdaccioToken: verdaccioToken || 'NA',
      description: existingPackageJson.description || '',
      authorName:
        typeof existingPackageJson.author === 'string'
          ? existingPackageJson.author
          : existingPackageJson.author?.name || 'Sample Author',
      authorEmail: existingPackageJson.author?.email || '',
      authorUrl: existingPackageJson.author?.url || '',
      homepage: existingPackageJson.homepage || '',
      keywords: existingPackageJson.keywords || [],
      license: existingPackageJson.license || 'MIT',
      customScripts: existingPackageJson.scripts
        ? Object.fromEntries(
            Object.entries(existingPackageJson.scripts).filter(
              ([key]) =>
                ![
                  'test',
                  'publish',
                  'publish:patch',
                  'publish:minor',
                  'publish:major',
                  'pub',
                  'pub:pat',
                  'pub:min',
                  'pub:maj',
                  'nogit:patch',
                  'nogit:minor',
                  'nogit:major',
                  'git',
                  'index',
                ].includes(key)
            )
          )
        : {},
      dependencies: existingPackageJson.dependencies || {},
      devDependencies: existingPackageJson.devDependencies || {},
    };

    if (
      answers.createGitHubPages === 'Yes' &&
      !existingPackageJson.repository
    ) {
      existingPackageJson.repository = {
        type: 'git',
        url: `git+https://github.com/${answers.githubUsername}/${answers.githubRepoName}.git`,
      };
      existingPackageJson.homepage = `https://github.com/${answers.githubUsername}/${answers.githubRepoName}`;
    }

    const newPackageJson = JSON.parse(generatePackageJson(answers));
    const updatedPackageJson = {
      ...existingPackageJson,
      scripts: {
        ...existingPackageJson.scripts,
        ...newPackageJson.scripts,
      },
      dependencies: {
        ...existingPackageJson.dependencies,
        ...newPackageJson.dependencies,
      },
      devDependencies: {
        ...existingPackageJson.devDependencies,
        ...newPackageJson.devDependencies,
      },
      main: newPackageJson.main,
      types: newPackageJson.types,
      type: newPackageJson.type,
      publishConfig: newPackageJson.publishConfig,
      repository: newPackageJson.repository,
      homepage: newPackageJson.homepage,
    };

    const skipFiles = [
      ...(fs.existsSync('.npmrc') ? ['.npmrc'] : []),
      ...(fs.existsSync('README.md') ? ['README.md'] : []),
      ...(fs.existsSync('WEBPAGE.md') ? ['WEBPAGE.md'] : []),
      ...(fs.existsSync('index.html') ? ['index.html'] : []),
      ...(fs.existsSync('LICENSE') ? ['LICENSE'] : []),
      ...(fs.existsSync(
        answers.useTypeScript === 'Yes' ? 'src/index.ts' : 'index.js'
      )
        ? [answers.useTypeScript === 'Yes' ? 'src/index.ts' : 'index.js']
        : []),
      ...(fs.existsSync(
        answers.useTypeScript === 'Yes'
          ? 'test/index.test.ts'
          : 'test/index.test.js'
      )
        ? [
            answers.useTypeScript === 'Yes'
              ? 'test/index.test.ts'
              : 'test/index.test.js',
          ]
        : []),
      ...(fs.existsSync('.npmignore') ? ['.npmignore'] : []),
      ...(fs.existsSync('tsconfig.json') ? ['tsconfig.json'] : []),
      ...(fs.existsSync('.eslintrc.json') ? ['.eslintrc.json'] : []),
      ...(fs.existsSync('.prettierrc') ? ['.prettierrc'] : []),
      ...(fs.existsSync('.github/workflows/publish.yml')
        ? ['.github/workflows/publish.yml']
        : []),
      ...(fs.existsSync('.gitlab-ci.yml') ? ['.gitlab-ci.yml'] : []),
      ...(fs.existsSync('.circleci/config.yml')
        ? ['.circleci/config.yml']
        : []),
      ...(fs.existsSync('.github/workflows/gh-pages.yml')
        ? ['.github/workflows/gh-pages.yml']
        : []),
      ...(fs.existsSync('.gitignore') ? ['.gitignore'] : []),
    ];

    if (
      ['GitHub Packages', 'Both', 'Custom', 'All'].includes(
        answers.publishTo
      ) &&
      !fs.existsSync('.env')
    ) {
      const envContent = require('./init').generateEnv(answers);
      if (envContent) {
        writeFile('.env', envContent, 'Generated .env', dryRun);
      }
    }

    if (
      ['GitHub Packages', 'Both', 'All'].includes(answers.publishTo) &&
      !fs.existsSync('.npmrc') &&
      answers.githubRepoToken.toLowerCase() !== 'na'
    ) {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubRepoToken
      );
      if (npmrcContent) {
        writeFile('.npmrc', npmrcContent, 'Generated .npmrc', dryRun);
      }
    }

    await init(false, false, packageVersion, verbose, null, dryRun, {
      answers,
      skipFiles,
      mergedPackageJson: updatedPackageJson,
    });

    console.log('\n' + colorize('🎉 Package upgrade complete!', '1;36'));
    console.log('\n' + colorize('📋 Next steps:', '1;36'));
    const nextSteps = generateNextSteps(answers, true, isWindows);
    nextSteps.forEach(step => console.log(step));
  } catch (err) {
    logger.error(`Error in upgrade: ${err.message}`, err.stack);
    console.error(colorize('❌ Error:', '31'), err.message);
    console.error(
      colorize(
        '💡 Check your file permissions, network connection, or try running with --dry-run.',
        '33'
      )
    );
    process.exit(1);
  }
}

module.exports = { upgrade };
