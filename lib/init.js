const { execSync } = require('child_process');
const {
  colorize,
  getInquirer,
  fs,
  path,
  mergeConfigWithDefaults,
  logger,
  validateConfig,
  createGitHubRepo,
  retry,
  writeFile,
} = require('./utils');
const { promptPackageDetails } = require('./promptPackageDetails');
const { generateSampleAnswers } = require('./generateSampleAnswers');
const { generatePackageJson } = require('./generatePackageJson');
const { generateNpmrc } = require('./generateNpmrc');
const { generateReadme } = require('./generateReadme');
const { generateLicense } = require('./generateLicense');
const { generateGitignore } = require('./generateGitignore');
const { generateGitHubWorkflow } = require('./generateGitHubWorkflow');
const { generateGitLabWorkflow } = require('./generateGitLabWorkflow');
const { generateCircleCIWorkflow } = require('./generateCircleCIWorkflow');
const {
  generateGitHubPagesWorkflow,
} = require('./generateGitHubPagesWorkflow');
const { generateGitHubPagesIndex } = require('./generateGitHubPagesIndex');
const { generateIndexFile } = require('./generateIndexFile');
const { generateTsConfig } = require('./generateTsConfig');
const { generateEslintConfig } = require('./generateEslintConfig');
const { generatePrettierConfig } = require('./generatePrettierConfig');
const { generateTestFile } = require('./generateTestFile');
const { generateNpmIgnore } = require('./generateNpmIgnore');
const { generateWebpage } = require('./generateWebpage');
const { generateNextSteps } = require('./generateNextSteps');

async function init(
  noGit,
  useSample,
  packageVersion,
  verbose,
  configPath,
  dryRun,
  options = {}
) {
  logger.setVerbose(verbose);
  logger.info(
    `Starting init process (version: ${packageVersion}, dryRun: ${dryRun})`
  );

  const {
    answers: providedAnswers,
    skipFiles = [],
    mergedPackageJson,
  } = options;

  try {
    const isWindows = process.platform === 'win32';
    logger.debug(`Current directory: ${process.cwd()}`);
    console.log(
      colorize(
        `🚀 Welcome to build-a-npm v${packageVersion}! Let's create your Node package.`,
        '36'
      ) + '\n'
    );

    // Load and validate config file if provided
    let config = {};
    if (configPath) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const validation = validateConfig(config);
        if (!validation.valid) {
          logger.error(`Invalid config file: ${validation.errors.join(', ')}`);
          console.error(
            colorize(
              `❌ Invalid config file: ${validation.errors.join(', ')}`,
              '31'
            )
          );
          process.exit(1);
        }
        logger.debug(`Loaded config from ${configPath}:`, config);
      } catch (err) {
        logger.error(`Failed to load config file: ${err.message}`);
        console.error(
          colorize(`❌ Failed to load config file: ${err.message}`, '31')
        );
        process.exit(1);
      }
    }

    // Save state for recovery
    const stateFile = '.build-a-npm-state.json';
    const saveState = answers => {
      if (!dryRun) {
        fs.writeFileSync(stateFile, JSON.stringify(answers, null, 2));
        logger.debug(`Saved state to ${stateFile}`);
      }
    };

    // Check if package.json exists (only for new projects)
    if (!providedAnswers && fs.existsSync('package.json')) {
      const inquirer = await getInquirer();
      const { overwrite } = await inquirer.prompt([
        {
          type: 'list',
          name: 'overwrite',
          message: 'package.json already exists. Do you want to overwrite it?',
          choices: ['Yes', 'No'],
          default: 'No',
        },
      ]);
      if (overwrite === 'No') {
        logger.info('Cancelled by user. No files modified.');
        console.log(colorize('⏹️ Cancelled. No files were modified.', '33'));
        return;
      }
    }

    // Use provided answers, sample data, config file, or prompt
    const defaultAnswers = useSample ? generateSampleAnswers() : {};
    const answers =
      providedAnswers ||
      (useSample
        ? defaultAnswers
        : await promptPackageDetails(
            mergeConfigWithDefaults(config, defaultAnswers)
          ));
    answers.noGit = noGit; // Add noGit to answers for generateNextSteps
    saveState(answers);

    logger.debug('Answers:', answers);
    const isGitHub = ['GitHub Packages', 'Both'].includes(answers.publishTo);

    // Change to new directory if specified (only for new projects)
    let packageDir = process.cwd();
    if (!providedAnswers && answers.useMonorepo === 'Yes') {
      packageDir = path.join(answers.monorepoRoot, 'packages', answers.name);
      logger.debug(`Creating monorepo package directory: ${packageDir}`);
      if (!dryRun) {
        fs.mkdirSync(packageDir, { recursive: true });
      }
    } else if (
      !providedAnswers &&
      answers.useNewDir === 'Yes, same as my Package Name'
    ) {
      packageDir = answers.name;
      if (fs.existsSync(packageDir)) {
        logger.error(`Directory ${packageDir} already exists`);
        console.error(
          colorize(`❌ Directory ${packageDir} already exists.`, '31')
        );
        process.exit(1);
      }
      if (!dryRun) {
        fs.mkdirSync(packageDir);
      }
    } else if (!providedAnswers && answers.useNewDir === 'Yes, a Custom Name') {
      packageDir = answers.projectDir;
      if (fs.existsSync(packageDir)) {
        logger.error(`Directory ${packageDir} already exists`);
        console.error(
          colorize(`❌ Directory ${packageDir} already exists.`, '31')
        );
        process.exit(1);
      }
      if (!dryRun) {
        fs.mkdirSync(packageDir);
      }
    }
    if (!dryRun && packageDir !== process.cwd()) {
      process.chdir(packageDir);
    }
    logger.debug(`Changed to directory: ${process.cwd()}`);

    // Create GitHub repository if selected (only for new projects)
    if (
      !providedAnswers &&
      isGitHub &&
      answers.createGitHubRepo === 'Yes' &&
      answers.githubToken.toLowerCase() !== 'na'
    ) {
      logger.info('Creating GitHub repository');
      if (!dryRun) {
        await retry(
          async () => {
            await createGitHubRepo(
              answers.githubUsername,
              answers.githubRepoName,
              answers.githubToken,
              answers.access
            );
          },
          {
            retries: 3,
            onError: err =>
              logger.warn(
                `GitHub repo creation attempt failed: ${err.message}`
              ),
          }
        );
      }
      console.log(colorize('✅ Created GitHub repository', '32'));
    }

    // Generate package.json
    if (!skipFiles.includes('package.json')) {
      const packageJsonContent = mergedPackageJson
        ? JSON.stringify(mergedPackageJson, null, 2)
        : generatePackageJson(answers);
      writeFile(
        'package.json',
        packageJsonContent,
        mergedPackageJson ? 'Updated package.json' : 'Generated package.json',
        dryRun
      );
    }

    // Copy publish.js
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
      colorize('✅ Copied publish.js to node_modules/build-a-npm', '32')
    );

    // Generate .npmrc
    if (
      !skipFiles.includes('.npmrc') &&
      (isGitHub || answers.createGitHubPages === 'Yes') &&
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

    // Generate README.md
    if (!skipFiles.includes('README.md')) {
      const readmeContent = generateReadme(answers);
      writeFile('README.md', readmeContent, 'Generated README.md', dryRun);
    }

    // Generate WEBPAGE.md for GitHub Pages
    if (
      !skipFiles.includes('WEBPAGE.md') &&
      answers.createGitHubPages === 'Yes'
    ) {
      const webpageContent = generateWebpage(answers);
      writeFile(
        'WEBPAGE.md',
        webpageContent,
        'Generated WEBPAGE.md for GitHub Pages',
        dryRun
      );
    }

    // Generate index.html for GitHub Pages
    if (
      !skipFiles.includes('index.html') &&
      answers.createGitHubPages === 'Yes'
    ) {
      try {
        require('marked');
        const webpageContent = fs.existsSync('WEBPAGE.md')
          ? fs.readFileSync('WEBPAGE.md', 'utf-8')
          : generateWebpage(answers);
        const indexHtmlContent = generateGitHubPagesIndex(webpageContent);
        writeFile(
          'index.html',
          indexHtmlContent,
          'Generated index.html for GitHub Pages',
          dryRun
        );
      } catch (err) {
        logger.warn(`Skipping index.html generation: ${err.message}`);
        console.log(
          colorize(
            `⚠️ Skipped generating index.html: ${err.message}. Install 'marked' with \`npm install marked\` or create WEBPAGE.md manually.`,
            '33'
          )
        );
      }
    }

    // Generate generateIndex.js for GitHub Pages
    if (
      !skipFiles.includes('generateIndex.js') &&
      answers.createGitHubPages === 'Yes'
    ) {
      const generateIndexContent = `const fs = require('fs');
const { marked } = require('marked');

try {
  if (!fs.existsSync('WEBPAGE.md')) {
    console.error('❌ WEBPAGE.md not found. Please create it to generate index.html.');
    process.exit(1);
  }

  const webpageContent = fs.readFileSync('WEBPAGE.md', 'utf-8');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const title = \`\${packageJson.name} Documentation\`;

  const html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0 auto;
      max-width: 800px;
      padding: 20px;
      background-color: #f9f9f9;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #333;
    }
    code {
      background-color: #f0f0f0;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre {
      background-color: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
\${marked(webpageContent)}
</body>
</html>\`;

  fs.writeFileSync('index.html', html);
  console.log('✅ Generated index.html from WEBPAGE.md');
} catch (err) {
  console.error('❌ Error generating index.html:', err.message);
  process.exit(1);
}
`;
      writeFile(
        'generateIndex.js',
        generateIndexContent,
        'Generated generateIndex.js for GitHub Pages',
        dryRun
      );
    }

    // Generate LICENSE
    if (!skipFiles.includes('LICENSE')) {
      const licenseContent = generateLicense(
        answers.license,
        answers.authorName
      );
      if (licenseContent) {
        writeFile('LICENSE', licenseContent, 'Generated LICENSE', dryRun);
      }
    }

    // Generate main index.js or index.ts
    const indexPath =
      answers.useTypeScript === 'Yes' ? 'src/index.ts' : 'index.js';
    if (
      !skipFiles.includes(indexPath) &&
      (!fs.existsSync(indexPath) || dryRun)
    ) {
      const indexContent = generateIndexFile(
        answers.useTypeScript === 'Yes',
        answers.moduleType === 'ES Modules'
      );
      if (answers.useTypeScript === 'Yes' && !dryRun) {
        fs.mkdirSync('src', { recursive: true });
        logger.debug('Created src directory');
      }
      writeFile(indexPath, indexContent, `Generated ${indexPath}`, dryRun);
    }

    // Generate test file
    if (
      !skipFiles.includes('test/index.test.js') &&
      !skipFiles.includes('test/index.test.ts') &&
      answers.testFramework !== 'None'
    ) {
      const testPath =
        answers.useTypeScript === 'Yes'
          ? 'test/index.test.ts'
          : 'test/index.test.js';
      if (!fs.existsSync(testPath) || dryRun) {
        const testContent = generateTestFile(
          answers.testFramework,
          answers.useTypeScript === 'Yes',
          answers.moduleType === 'ES Modules'
        );
        if (!dryRun) {
          fs.mkdirSync('test', { recursive: true });
          logger.debug('Created test directory');
        }
        writeFile(testPath, testContent, `Generated ${testPath}`, dryRun);
      }
    }

    // Generate .npmignore
    if (!skipFiles.includes('.npmignore')) {
      const npmIgnoreContent = generateNpmIgnore(
        answers.useTypeScript === 'Yes'
      );
      writeFile('.npmignore', npmIgnoreContent, 'Generated .npmignore', dryRun);
    }

    // Generate tsconfig.json
    if (
      !skipFiles.includes('tsconfig.json') &&
      answers.useTypeScript === 'Yes'
    ) {
      const tsConfigContent = generateTsConfig();
      writeFile(
        'tsconfig.json',
        tsConfigContent,
        'Generated tsconfig.json',
        dryRun
      );
    }

    // Generate .eslintrc.json
    if (!skipFiles.includes('.eslintrc.json') && answers.useESLint === 'Yes') {
      const eslintConfigContent = generateEslintConfig(
        answers.useTypeScript === 'Yes'
      );
      writeFile(
        '.eslintrc.json',
        eslintConfigContent,
        'Generated .eslintrc.json',
        dryRun
      );
    }

    // Generate .prettierrc
    if (!skipFiles.includes('.prettierrc') && answers.usePrettier === 'Yes') {
      const prettierConfigContent = generatePrettierConfig();
      writeFile(
        '.prettierrc',
        prettierConfigContent,
        'Generated .prettierrc',
        dryRun
      );
    }

    // Generate CI/CD workflow
    if (
      !skipFiles.includes('.github/workflows/publish.yml') &&
      !skipFiles.includes('.gitlab-ci.yml') &&
      !skipFiles.includes('.circleci/config.yml') &&
      answers.ciProvider !== 'None' &&
      answers.createGitHubWorkflow === 'Yes'
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
      writeFile(
        workflowPath,
        workflowContent,
        `Generated ${workflowPath}`,
        dryRun
      );
    }

    // Generate GitHub Pages workflow
    if (
      !skipFiles.includes('.github/workflows/gh-pages.yml') &&
      answers.createGitHubPages === 'Yes'
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
          'Generated GitHub Pages workflow',
          dryRun
        );
      } catch (err) {
        logger.warn(
          `Skipping GitHub Pages workflow generation: ${err.message}`
        );
        console.log(
          colorize(
            `⚠️ Skipped generating GitHub Pages workflow: ${err.message}. Install 'marked' with \`npm install marked\`.`,
            '33'
          )
        );
      }
    }

    // Initialize git repository
    if (!providedAnswers && !noGit && !fs.existsSync('.git') && isGitHub) {
      try {
        await retry(
          () => {
            execSync('git init', { stdio: verbose ? 'inherit' : 'ignore' });
          },
          {
            retries: 3,
            onError: err =>
              logger.warn(`Git init attempt failed: ${err.message}`),
          }
        );
        logger.info('Initialized git repository');
        console.log(colorize('✅ Initialized git repository', '32'));
      } catch (err) {
        logger.warn(`Could not initialize git repository: ${err.message}`);
        console.log(
          colorize(
            `⚠️ Could not initialize git repository: ${err.message}`,
            '33'
          )
        );
        console.log(
          colorize(
            '💡 Run `git init` manually to initialize the repository.',
            '33'
          )
        );
      }
    }

    // Generate root package.json for monorepo
    if (!providedAnswers && answers.useMonorepo === 'Yes') {
      const rootDir = path.resolve(answers.monorepoRoot);
      if (!dryRun) {
        process.chdir(rootDir);
      }
      logger.debug(`Changed to root directory: ${process.cwd()}`);
      if (!fs.existsSync('package.json') || dryRun) {
        const rootPackageJson = {
          name: 'monorepo-root',
          private: true,
          workspaces:
            answers.packageManager === 'yarn'
              ? ['packages/*']
              : { packages: ['packages/*'] },
        };
        const rootPackageJsonContent = JSON.stringify(rootPackageJson, null, 2);
        writeFile(
          'package.json',
          rootPackageJsonContent,
          'Generated root package.json for monorepo',
          dryRun
        );
      }
    }

    // Generate .gitignore
    if (!skipFiles.includes('.gitignore')) {
      const gitignoreContent = generateGitignore(
        answers.useTypeScript === 'Yes'
      );
      writeFile('.gitignore', gitignoreContent, 'Generated .gitignore', dryRun);
    }

    if (!dryRun && fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
      logger.debug(`Removed state file ${stateFile}`);
    }

    // Print next steps
    console.log('\n' + colorize('🎉 Package setup complete!', '1;36'));
    console.log('\n' + colorize('📋 Next steps:', '1;36'));
    const nextSteps = generateNextSteps(answers, false, isWindows);
    nextSteps.forEach(step => console.log(step));
  } catch (err) {
    logger.error(`Error in init: ${err.message}`, err.stack);
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

module.exports = { init };
