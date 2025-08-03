// lib/generateWebpage.js
function generateWebpage(answers) {
  return `# ${answers.name} Documentation

Welcome to the GitHub Pages documentation for ${answers.name}.

This page is generated from WEBPAGE.md. Edit this file to customize your GitHub Pages content, then run \`npm run index\` to update the index.html file.

## Getting Started

- Add your documentation content here.
- Use Markdown formatting for headings, lists, links, etc.
- Example: [Link to ${answers.name} repository](https://github.com/${answers.githubUsername}/${answers.githubRepoName})

## Next Steps

- Update this file with your project details.
- Run \`npm run index\` to regenerate index.html.
- Commit changes to the main branch to update your GitHub Pages site.
`;
}

module.exports = { generateWebpage };
