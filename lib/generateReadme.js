const { logger } = require("./utils");

function generateReadme(answers) {
  logger.debug("Generating README.md");
  const content = `# ${answers.name}

${answers.description || "A Node.js package."}

## Installation
\`\`\`bash
npm install ${answers.name}
\`\`\`

## Usage
\`\`\`javascript
${
  answers.moduleType === "ES Modules"
    ? `import myPackage from '${answers.name}';`
    : `const myPackage = require('${answers.name}');`
}
// Your code here
\`\`\`

${
  answers.useVitePress === "Yes"
    ? `## Documentation
Visit the [documentation](https://${answers.githubUsername}.github.io/${
        answers.githubRepoName || answers.name
      }/) for detailed usage instructions.`
    : ""
}

## License
${answers.license}
`;
  return content;
}

module.exports = { generateReadme };
