const { logger } = require("./utils");

function generateNpmIgnore(answers) {
  logger.debug("Generating .npmignore");
  const content = `
node_modules/
dist/
${
  answers.useVitePress === "Yes"
    ? `${answers.docsDir || "docs"}/.vitepress/dist/\n${
        answers.docsDir || "docs"
      }/.vitepress/cache/`
    : ""
}
coverage/
*.log
.env
tests/
`;
  return content;
}

module.exports = { generateNpmIgnore };
