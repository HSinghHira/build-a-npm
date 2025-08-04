const fs = require('fs');
const { marked } = require('marked');
const { generateGitHubPagesIndex } = require('./generateGitHubPagesIndex');
const { generateLicense } = require('./generateLicense');

try {
  if (!fs.existsSync('WEBPAGE.md')) {
    console.error(
      '❌ WEBPAGE.md not found. Please create it to generate index.html.'
    );
    process.exit(1);
  }

  const webpageContent = fs.readFileSync('WEBPAGE.md', 'utf-8');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const title = `${packageJson.name} Documentation`;
  const description =
    packageJson.description || 'Documentation for ' + packageJson.name;
  const authorName =
    typeof packageJson.author === 'string'
      ? packageJson.author
      : packageJson.author?.name || 'Unknown Author';
  const license = packageJson.license || 'MIT';
  const licenseText = generateLicense(license, authorName);
  const repositoryUrl =
    packageJson.repository?.url || 'https://github.com/username/repository';
  const main = packageJson.main || 'index.js';

  // Configure marked options for better parsing (matching generateGitHubPagesIndex.js)
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    headerPrefix: '',
  });

  const html = generateGitHubPagesIndex(
    webpageContent,
    title,
    description,
    authorName,
    license,
    licenseText,
    repositoryUrl,
    main
  );

  fs.writeFileSync('index.html', html);
  console.log('✅ Generated index.html from WEBPAGE.md');
} catch (err) {
  console.error('❌ Error generating index.html:', err.message);
  process.exit(1);
}
