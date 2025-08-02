const { logger } = require("./utils");

function generateGitignore(answers) {
  logger.debug("Generating .gitignore");
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
`;
  return content;
}

module.exports = { generateGitignore };
