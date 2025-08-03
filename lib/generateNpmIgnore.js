function generateNpmIgnore(useTypeScript) {
  const baseIgnores = [
    'node_modules/',
    '.gitignore',
    '.npmrc',
    'build-a-npm.log',
    '.build-a-npm-state.json',
    'test/',
    '*.md',
    '.github/',
    '.gitlab-ci.yml',
    '.circleci/',
    '.vscode/',
    '.idea/',
    '.DS_Store',
    'coverage/',
    '.prettierrc',
    '.eslintrc.json',
    '.eslintignore',
    'tsconfig.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '*.tgz',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    'WEBPAGE.md',
    'index.html',
    'generateIndex.js',
  ];
  if (useTypeScript) {
    baseIgnores.push('src/', '!dist/');
  }
  return baseIgnores.join('\n') + '\n';
}

module.exports = { generateNpmIgnore };
