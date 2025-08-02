const { logger } = require("./utils");

function generateEslintConfig(answers) {
  logger.debug("Generating .eslintrc.json");
  const content = JSON.stringify(
    {
      env: {
        node: true,
        es2021: true,
      },
      extends: [
        "eslint:recommended",
        ...(answers.useTypeScript === "Yes"
          ? ["plugin:@typescript-eslint/recommended"]
          : []),
      ],
      parser:
        answers.useTypeScript === "Yes"
          ? "@typescript-eslint/parser"
          : undefined,
      plugins: answers.useTypeScript === "Yes" ? ["@typescript-eslint"] : [],
      rules: {
        "no-unused-vars": answers.useTypeScript === "Yes" ? "off" : "error",
        ...(answers.useTypeScript === "Yes" && {
          "@typescript-eslint/no-unused-vars": ["error"],
        }),
      },
    },
    null,
    2
  );
  return content;
}

module.exports = { generateEslintConfig };
