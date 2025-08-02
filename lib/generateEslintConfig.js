function generateEslintConfig(useTypeScript) {
  return JSON.stringify(
    {
      env: {
        node: true,
        es2021: true,
      },
      extends: [
        "standard",
        ...(useTypeScript ? ["plugin:@typescript-eslint/recommended"] : []),
      ],
      parser: useTypeScript ? "@typescript-eslint/parser" : undefined,
      plugins: useTypeScript ? ["@typescript-eslint"] : [],
      rules: {
        "no-unused-vars": useTypeScript ? "off" : ["error"],
        ...(useTypeScript
          ? { "@typescript-eslint/no-unused-vars": ["error"] }
          : {}),
      },
    },
    null,
    2
  );
}

module.exports = { generateEslintConfig };