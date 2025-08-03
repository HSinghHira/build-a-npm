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

    // Check if package.json exists
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

    // Read existing package.json
    const existingPackageJson = JSON.parse(
      fs.readFileSync('package.json', 'utf-8')
    );
    logger.debug('Existing package.json:', existingPackageJson);

    // Check if build-a-npm is in devDependencies
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

    // Analyze package.json for suggestions
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
                : ['Yes', 'No'],
        default: 'No',
      }));

    // Prompt for confirmation and additional features
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
        message: 'GitHub username or organization for GitHub Pages:',
        default:
          existingPackageJson.repository?.url?.split('/')[3] ||
          existingPackageJson.name?.split('/')[0]?.replace('@', '') ||
          'sampleuser',
        when: answers => answers.createGitHubPages === 'Yes',
        validate: input =>
          input.trim() !== '' ? true : 'GitHub username is required',
        filter: input => input.toLowerCase(),
      },
      {
        type: 'input',
        name: 'githubRepoName',
        message: 'GitHub repository name for GitHub Pages:',
        default:
          existingPackageJson.repository?.url
            ?.split('/')
            .slice(-1)[0]
            ?.replace('.git', '') || existingPackageJson.name,
        when: answers => answers.createGitHubPages === 'Yes',
        validate: input =>
          input.trim() !== '' ? true : 'GitHub repository name is required',
      },
      {
        type: 'input',
        name: 'githubToken',
        message:
          "Enter your GitHub Personal Access Token with 'pages:write' scope (or 'NA' to skip):",
        default: 'NA',
        when: answers => answers.createGitHubPages === 'Yes',
        validate: async (input, answers) => {
          input = input.trim();
          if (input.toLowerCase() === 'na') return true;
          if (input === '')
            return "GitHub token is required (or enter 'NA' to skip)";
          if (!/^(ghp_|ghf_)?[A-Za-z0-9_]{36,}$/.test(input))
            return "Invalid GitHub token format. Ensure it's a valid Personal Access Token or enter 'NA' to skip.";
          try {
            const octokit = new Octokit({ auth: input });
            const { data } = await octokit.users.getAuthenticated();
            logger.debug(`Authenticated as ${data.login}`);
            const scopes = await octokit.request('HEAD /');
            const tokenScopes =
              scopes.headers['x-oauth-scopes']?.split(', ') || [];
            if (!tokenScopes.includes('pages:write')) {
              return "GitHub token must have 'pages:write' scope. Create a token at https://github.com/settings/tokens with 'pages:write' permission.";
            }
            return true;
          } catch (err) {
            logger.warn(`GitHub token validation failed: ${err.message}`);
            return "Invalid GitHub token. Ensure it has 'pages:write' permission for GitHub Pages or enter 'NA' to skip. Create a token at https://github.com/settings/tokens.";
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
      githubToken,
      access,
      useTypeScript,
      useESLint,
      usePrettier,
      testFramework,
      moduleType,
      ciProvider,
      createGitHubPages,
    } = await inquirer.prompt(promptQuestions);

    if (confirm === 'No') {
      logger.info('Cancelled by user. No files modified.');
      console.log(colorize('⏹️ Cancelled. No files were modified.', '33'));
      return;
    }

    // Determine publishTo
    const isGitHub =
      existingPackageJson.publishConfig?.registry?.includes(
        'npm.pkg.github.com'
      ) || existingPackageJson.repository?.url?.includes('github.com');
    const publishTo = isGitHub
      ? existingPackageJson.publishConfig?.registry?.includes(
          'registry.npmjs.org'
        )
        ? 'Both'
        : 'GitHub Packages'
      : 'npmjs';

    // Generate answers
    const answers = {
      publishTo,
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
      githubToken: githubToken || 'NA',
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

    // Update package.json with repository if needed
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

    // Merge package.json
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

    // Determine files to skip
    const skipFiles = [
      ...(fs.existsSync('.npmrc') ? ['.npmrc'] : []),
      ...(fs.existsSync('README.md') ? ['README.md'] : []),
      ...(fs.existsSync('WEBPAGE.md') ? ['WEBPAGE.md'] : []),
      ...(fs.existsSync('index.html') ? ['index.html'] : []),
      ...(fs.existsSync('generateIndex.js') ? ['generateIndex.js'] : []),
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

    // Generate .npmrc
    if (
      (['GitHub Packages', 'Both'].includes(answers.publishTo) ||
        answers.createGitHubPages === 'Yes') &&
      !fs.existsSync('.npmrc') &&
      answers.githubToken.toLowerCase() !== 'na'
    ) {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken,
        answers.createGitHubPages === 'Yes'
      );
      if (npmrcContent) {
        writeFile('.npmrc', npmrcContent, 'Generated .npmrc', dryRun);
      }
    }

    // Call init.js
    await init(false, false, packageVersion, verbose, null, dryRun, {
      answers,
      skipFiles,
      mergedPackageJson: updatedPackageJson,
    });

    // Print next steps
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
