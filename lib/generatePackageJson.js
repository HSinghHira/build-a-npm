function generatePackageJson(answers) {
  const scripts = {
    test:
      answers.testFramework !== 'None'
        ? 'echo "Run tests here." && exit 0'
        : 'echo "Error: no test specified" && exit 1',
    index:
      answers.createGitHubPages === 'Yes' ? 'node generateIndex.js' : undefined,
    console: 'node node_modules/build-a-npm/lib/publishConsole.js',
    git: `npm run index && git add . && git commit -m \"chore: updates\" && git branch -M main && git remote add origin https://github.com/${answers.githubUsername}/${answers.githubRepoName}.git && git push`,
    publish: 'npm run publish:patch',
    'publish:patch':
      'node node_modules/build-a-npm/publish.js --patch --npmjs --github && npm run git && npm run console',
    'publish:minor':
      'node node_modules/build-a-npm/publish.js --minor --npmjs --github && npm run git && npm run console',
    'publish:major':
      'node node_modules/build-a-npm/publish.js --major --npmjs --github && npm run git && npm run console',
    pub: 'npm run publish:patch',
    'pub:pat': 'npm run publish:patch',
    'pub:min': 'npm run publish:minor',
    'pub:maj': 'npm run publish:major',
    'nogit:patch':
      'node node_modules/build-a-npm/publish.js --patch  --npmjs --github && npm run console',
    'nogit:minor':
      'node node_modules/build-a-npm/publish.js --minor  --npmjs --github && npm run console',
    'nogit:major':
      'node node_modules/build-a-npm/publish.js --major  --npmjs --github && npm run console',
    do: 'npm run git && node publish.js --patch --github --npmjs && npm run console',
    format: 'prettier --write .',
    ...answers.customScripts,
  };

  const devDependencies = {
    'build-a-npm': '*',
    ...(answers.useTypeScript === 'Yes' ? { typescript: '^5.6.2' } : {}),
    ...(answers.useESLint === 'Yes' ? { eslint: '^9.11.1' } : {}),
    ...(answers.usePrettier === 'Yes' ? { prettier: '^3.3.3' } : {}),
    ...(answers.testFramework === 'Jest' ? { jest: '^29.7.0' } : {}),
    ...(answers.testFramework === 'Mocha' ? { mocha: '^10.7.3' } : {}),
    ...(answers.testFramework === 'Vitest' ? { vitest: '^2.1.1' } : {}),
    ...(answers.createGitHubPages === 'Yes' ? { marked: '^14.1.2' } : {}),
    ...answers.devDependencies,
  };

  const packageJson = {
    name: answers.name,
    version: answers.version || '1.0.0',
    description: answers.description,
    main: answers.useTypeScript === 'Yes' ? 'dist/index.js' : 'index.js',
    types: answers.useTypeScript === 'Yes' ? 'dist/index.d.ts' : undefined,
    type: answers.moduleType === 'ES Modules' ? 'module' : 'commonjs',
    scripts: Object.fromEntries(
      Object.entries(scripts).filter(([_, v]) => v !== undefined)
    ),
    repository: answers.repository || {
      type: 'git',
      url: `git+https://github.com/${answers.githubUsername}/${answers.githubRepoName}.git`,
    },
    homepage:
      answers.homepage ||
      `https://github.com/${answers.githubUsername}/${answers.githubRepoName}`,
    keywords: answers.keywords,
    author: answers.authorName
      ? answers.authorEmail || answers.authorUrl
        ? {
            name: answers.authorName,
            email: answers.authorEmail,
            url: answers.authorUrl,
          }
        : answers.authorName
      : undefined,
    license: answers.license,
    publishConfig: {
      access: answers.access,
      ...(answers.publishTo === 'GitHub Packages' ||
      answers.publishTo === 'Both'
        ? { registry: 'https://npm.pkg.github.com/' }
        : answers.publishTo === 'npmjs'
          ? { registry: 'https://registry.npmjs.org/' }
          : {}),
    },
    dependencies: answers.dependencies,
    devDependencies: Object.fromEntries(
      Object.entries(devDependencies).filter(([_, v]) => v !== undefined)
    ),
  };

  return JSON.stringify(packageJson, null, 2);
}

module.exports = { generatePackageJson };
