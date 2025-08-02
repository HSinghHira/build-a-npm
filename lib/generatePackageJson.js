const { logger } = require("./utils");

function generatePackageJson(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const isNpm = ["npmjs", "Both"].includes(answers.publishTo);
  const packageManager = answers.packageManager || "npm";

  const packageJson = {
    name: answers.name,
    version: answers.version,
    description: answers.description || "",
    main: answers.useTypeScript === "Yes" ? "dist/index.js" : "src/index.js",
    scripts: {
      start: "node src/index.js",
      ...(answers.testFramework !== "None" && { test: `${answers.testFramework.toLowerCase()} --watchAll` }),
      ...(answers.useESLint === "Yes" && { lint: "eslint src/" }),
      ...(answers.usePrettier === "Yes" && { format: "prettier --write src/" }),
      ...(answers.useVitePress === "Yes" && {
        "docs:dev": `vitepress dev ${answers.docsDir || "docs"}`,
        "docs:build": `vitepress build ${answers.docsDir || "docs"}`,
        "docs:preview": `vitepress preview ${answers.docsDir || "docs"}`,
      }),
      ...answers.customScripts,
    },
    keywords: answers.keywords || [],
    author: answers.authorName
      ? {
          name: answers.authorName,
          email: answers.authorEmail || undefined,
          url: answers.authorUrl || undefined,
        }
      : undefined,
    license: answers.license,
    publishConfig: {
      access: answers.access,
      registry: isNpm
        ? "https://registry.npmjs.org/"
        : "https://npm.pkg.github.com/",
    },
    repository: isGitHub
      ? {
          type: "git",
          url: `git+https://github.com/${answers.githubUsername}/${answers.githubRepoName || answers.name}.git`,
        }
      : undefined,
    homepage: answers.homepage || undefined,
    dependencies: answers.dependencies || {},
    devDependencies: {
      ...(answers.useTypeScript === "Yes" && {
        typescript: "^5.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0",
        "ts-node": "latest",
        "@types/node": "latest",
      }),
      ...(answers.useESLint === "Yes" && { eslint: "^8.0.0" }),
      ...(answers.usePrettier === "Yes" && { prettier: "^3.0.0" }),
      ...(answers.testFramework === "Jest" && { jest: "latest", "@types/jest": "latest" }),
      ...(answers.testFramework === "Mocha" && { mocha: "latest", chai: "latest", "@types/chai": "latest" }),
      ...(answers.testFramework === "Vitest" && { vitest: "latest" }),
      ...(answers.useVitePress === "Yes" && { vitepress: "^1.0.0" }),
      ...answers.devDependencies,
    },
  };

  if (isGitHub && isNpm) {
    packageJson.publishConfig = {
      access: answers.access,
    };
  }

  if (answers.moduleType === "ES Modules") {
    packageJson.type = "module";
  }

  logger.debug("Generated package.json:", packageJson);
  return JSON.stringify(packageJson, null, 2);
}

module.exports = { generatePackageJson };