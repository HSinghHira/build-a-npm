function generatePrettierConfig() {
  return JSON.stringify(
    {
      semi: true,
      trailingComma: "es5",
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      bracketSpacing: true,
      arrowParens: "avoid",
    },
    null,
    2
  );
}

module.exports = { generatePrettierConfig };