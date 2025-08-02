const { logger } = require("./utils");

function generateIndexFile(answers) {
  logger.debug("Generating src/index.js");
  const content =
    answers.moduleType === "ES Modules"
      ? `export default function hello() {
  return "Hello from ${answers.name}!";
}
`
      : `module.exports = function hello() {
  return "Hello from ${answers.name}!";
};
`;
  return content;
}

module.exports = { generateIndexFile };
