const {
  colorize,
  getInquirer,
  fs,
  path,
  logger,
  validateConfig,
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
      createGitHubPages:
        !fs.existsSync('.github/workflows/gh-pages.yml') &&
        (existingPackageJson.repository?.url?.includes('github.com') ||
          existingPackageJson.publishConfig?.registry?.includes(
            'npm.pkg.github.com'
          ))
          ? 'Publish README.md as documentation on GitHub Pages?'
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
          existingPackageJson.repository?.url?.includes('github.com') &&
          answers.ciProvider !== 'GitLab CI' &&
          answers.ciProvider !== 'CircleCI',
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

    // Determine publishTo based on existing package.json
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

    // Generate answers based on existing package.json
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
      githubUsername: isGitHub
        ? existingPackageJson.name.split('/')[0]?.replace('@', '') ||
          existingPackageJson.repository?.url?.split('/').slice(-2)[0] ||
          'sampleuser'
        : 'sampleuser',
      githubRepoName:
        existingPackageJson.repository?.url
          ?.split('/')
          .slice(-1)[0]
          ?.replace('.git', '') || existingPackageJson.name,
      githubToken: 'NA',
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
                ].includes(key)
            )
          )
        : {},
      dependencies: existingPackageJson.dependencies || {},
      devDependencies: existingPackageJson.devDependencies || {},
    };

    // File generation with dry-run support
    const writeFile = (filePath, content, description) => {
      if (dryRun) {
        logger.info(`Dry run: Would write ${filePath}`);
        console.log(colorize(`[Dry Run] Would generate ${filePath}`, '33'));
        logger.debug(`${filePath} content:`, content);
        return;
      }
      fs.writeFileSync(filePath, content);
      logger.info(`Generated ${filePath}`);
      console.log(colorize(`✅ ${description}`, '32'));
    };

    // Update package.json scripts and devDependencies
    const updatedPackageJson = JSON.parse(generatePackageJson(answers));
    existingPackageJson.scripts = {
      ...existingPackageJson.scripts,
      ...updatedPackageJson.scripts,
    };
    existingPackageJson.dependencies = {
      ...existingPackageJson.dependencies,
      ...updatedPackageJson.dependencies,
    };
    existingPackageJson.devDependencies = {
      ...existingPackageJson.devDependencies,
      ...updatedPackageJson.devDependencies,
    };
    existingPackageJson.main = updatedPackageJson.main;
    existingPackageJson.types = updatedPackageJson.types;
    existingPackageJson.type = updatedPackageJson.type;
    existingPackageJson.publishConfig = updatedPackageJson.publishConfig;
    existingPackageJson.repository = updatedPackageJson.repository;
    existingPackageJson.homepage = updatedPackageJson.homepage;
    writeFile(
      'package.json',
      JSON.stringify(existingPackageJson, null, 2),
      'Updated package.json'
    );

    // Ensure publish.js is in node_modules/build-a-npm
    const publishDir = path.join('node_modules', 'build-a-npm');
    if (!dryRun) {
      fs.mkdirSync(publishDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, '..', 'publish.js'),
        path.join(publishDir, 'publish.js')
      );
    }
    logger.debug(`Copied publish.js to ${publishDir}`);
    console.log(
      colorize('✅ Ensured publish.js in node_modules/build-a-npm', '32')
    );

    // Generate .npmrc if needed and not present
    if (
      ['GitHub Packages', 'Both'].includes(answers.publishTo) &&
      !fs.existsSync('.npmrc')
    ) {
      const npmrcContent = generateNpmrc(
        answers.githubUsername,
        answers.githubToken
      );
      if (npmrcContent) {
        writeFile('.npmrc', npmrcContent, 'Generated .npmrc');
      }
    }

    // Generate index.html for GitHub Pages if selected
    if (
      answers.createGitHubPages === 'Yes' &&
      !fs.existsSync('index.html') &&
      fs.existsSync('README.md')
    ) {
      try {
        require('marked');
        const readmeContent = fs.readFileSync('README.md', 'utf-8');
        const indexHtmlContent = generateGitHubPagesIndex(readmeContent);
        writeFile(
          'index.html',
          indexHtmlContent,
          'Generated index.html for GitHub Pages'
        );
      } catch (err) {
        logger.warn(
          "Skipping GitHub Pages index.html generation: 'marked' module not found"
        );
        console.log(
          colorize(
            "⚠️ Skipped generating index.html: 'marked' module not found. Install it in build-a-npm with `npm install marked`.",
            '33'
          )
        );
      }
    }

    // Generate GitHub Pages workflow if selected
    if (
      answers.createGitHubPages === 'Yes' &&
      !fs.existsSync('.github/workflows/gh-pages.yml')
    ) {
      try {
        require('marked');
        const ghPagesWorkflowContent = generateGitHubPagesWorkflow(answers);
        const ghPagesWorkflowPath = '.github/workflows/gh-pages.yml';
        if (!dryRun) {
          fs.mkdirSync('.github/workflows', { recursive: true });
        }
        writeFile(
          ghPagesWorkflowPath,
          ghPagesWorkflowContent,
          'Generated GitHub Pages workflow'
        );
      } catch (err) {
        logger.warn(
          "Skipping GitHub Pages workflow generation: 'marked' module not found"
        );
        console.log(
          colorize(
            "⚠️ Skipped generating GitHub Pages workflow: 'marked' module not found. Install it in build-a-npm with `npm install marked`.",
            '33'
          )
        );
      }
    }

    // Generate tsconfig.json if TypeScript is selected and not present
    if (answers.useTypeScript === 'Yes' && !fs.existsSync('tsconfig.json')) {
      const tsConfigContent = generateTsConfig();
      writeFile('tsconfig.json', tsConfigContent, 'Generated tsconfig.json');
    }

    // Generate .eslintrc.json if ESLint is selected and not present
    if (answers.useESLint === 'Yes' && !fs.existsSync('.eslintrc.json')) {
      const eslintConfigContent = generateEslintConfig(
        answers.useTypeScript === 'Yes'
      );
      writeFile(
        '.eslintrc.json',
        eslintConfigContent,
        'Generated .eslintrc.json'
      );
    }

    // Generate .prettierrc if Prettier is selected and not present
    if (answers.usePrettier === 'Yes' && !fs.existsSync('.prettierrc')) {
      const prettierConfigContent = generatePrettierConfig();
      writeFile('.prettierrc', prettierConfigContent, 'Generated .prettierrc');
    }

    // Generate test file if testing framework selected and not present
    if (
      answers.testFramework !== 'None' &&
      !fs.existsSync(
        answers.useTypeScript === 'Yes'
          ? 'test/index.test.ts'
          : 'test/index.test.js'
      )
    ) {
      const testContent = generateTestFile(
        answers.testFramework,
        answers.useTypeScript === 'Yes',
        answers.moduleType === 'ES Modules'
      );
      if (!dryRun) {
        fs.mkdirSync('test', { recursive: true });
        logger.debug('Created test directory');
      }
      writeFile(
        answers.useTypeScript === 'Yes'
          ? 'test/index.test.ts'
          : 'test/index.test.js',
        testContent,
        'Generated test file'
      );
    }

    // Generate .npmignore
    if (!fs.existsSync('.npmignore')) {
      const npmIgnoreContent = generateNpmIgnore(
        answers.useTypeScript === 'Yes'
      );
      writeFile('.npmignore', npmIgnoreContent, 'Generated .npmignore');
    }

    // Generate CI/CD workflow if needed
    if (
      answers.ciProvider !== 'None' &&
      answers.createGitHubWorkflow === 'Yes' &&
      !fs.existsSync(
        answers.ciProvider === 'GitHub Actions'
          ? '.github/workflows/publish.yml'
          : answers.ciProvider === 'GitLab CI'
            ? '.gitlab-ci.yml'
            : '.circleci/config.yml'
      )
    ) {
      const workflowDir =
        answers.ciProvider === 'GitHub Actions'
          ? '.github/workflows'
          : answers.ciProvider === 'GitLab CI'
            ? ''
            : '.circleci';
      const workflowFile =
        answers.ciProvider === 'GitHub Actions'
          ? 'publish.yml'
          : answers.ciProvider === 'GitLab CI'
            ? '.gitlab-ci.yml'
            : 'config.yml';
      const workflowPath = path.join(workflowDir, workflowFile);
      let workflowContent;
      if (answers.ciProvider === 'GitHub Actions') {
        workflowContent = generateGitHubWorkflow(answers);
      } else if (answers.ciProvider === 'GitLab CI') {
        workflowContent = generateGitLabWorkflow(answers);
      } else if (answers.ciProvider === 'CircleCI') {
        workflowContent = generateCircleCIWorkflow(answers);
      }
      if (!dryRun) {
        fs.mkdirSync(workflowDir, { recursive: true });
      }
      writeFile(workflowPath, workflowContent, `Generated ${workflowPath}`);
    }

    // Generate .gitignore if not present
    if (!fs.existsSync('.gitignore')) {
      const gitignoreContent = generateGitignore(
        answers.useTypeScript === 'Yes'
      );
      writeFile('.gitignore', gitignoreContent, 'Generated .gitignore');
    }

    console.log('\n' + colorize('🎉 Package upgrade complete!', '1;36'));
    console.log('\n' + colorize('📋 Next steps:', '1;36'));
    console.log(
      colorize(`1. Run \`npm install\` to update dependencies`, '36')
    );
    if (isWindows) {
      console.log(
        colorize(
          '   - On Windows, run commands in an Administrator Command Prompt to avoid permissions errors',
          '33'
        )
      );
    } else {
      console.log(
        colorize(
          '   - Ensure you have write permissions for the project directory',
          '33'
        )
      );
    }
    if (['GitHub Packages', 'Both'].includes(answers.publishTo)) {
      console.log(
        colorize(
          "2. Verify your GITHUB_TOKEN in .npmrc has the 'write:packages' scope",
          '36'
        )
      );
      console.log(
        colorize(
          '   - Create a token at https://github.com/settings/tokens if needed',
          '33'
        )
      );
      if (answers.createGitHubWorkflow === 'Yes') {
        console.log(
          colorize(
            '3. Configure GitHub Actions secrets (NPM_TOKEN and/or GITHUB_TOKEN)',
            '36'
          )
        );
      }
      if (answers.createGitHubPages === 'Yes') {
        console.log(
          colorize(
            '4. Enable GitHub Pages in your repository settings (Settings > Pages > Source: gh-pages branch)',
            '36'
          )
        );
        console.log(
          colorize(
            "   - Ensure your GITHUB_TOKEN has the 'pages:write' scope",
            '33'
          )
        );
      }
    }
    console.log(
      colorize(
        `5. Run \`npm run publish\` to publish your updated package`,
        '36'
      )
    );
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
