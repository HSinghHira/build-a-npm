function generateReadme(answers) {
  const packageName = answers.name;
  const publishTo = answers.publishTo;

  return `# ${packageName}

${answers.description || "A new Node.js package"}

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

Add your usage instructions here.

## Publishing

Run \`npm run publish\` to publish to ${
    publishTo === "Both"
      ? "npmjs.org and GitHub Packages"
      : publishTo === "npmjs"
      ? "npmjs.org"
      : "GitHub Packages"
  }.
Use \`npm run publish:minor\` or \`:major\` for minor or major version bumps.

## License

${answers.license}
`;
}

module.exports = { generateReadme };