const { logger } = require("./utils");

function generatePrettierConfig(answers) {
  logger.debug("Generating .prettierrc");
  const content = JSON.stringify(
    {
      semi: true,
      trailingComma: "es5",
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
    },
    null,
    2
  );
  return content;
}

module.exports = { generatePrettierConfig };
