const fs = require('fs');
const { marked } = require('marked');
const { generateGitHubPagesIndex } = require('./lib/generateGitHubPagesIndex');

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

  // Configure marked options for better parsing (matching generateGitHubPagesIndex.js)
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    headerPrefix: '',
  });

  const html = generateGitHubPagesIndex(webpageContent);

  fs.writeFileSync('index.html', html);
  console.log('✅ Generated index.html from WEBPAGE.md');
} catch (err) {
  console.error('❌ Error generating index.html:', err.message);
  process.exit(1);
}
