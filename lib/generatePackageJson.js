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
    ...(answers.useNodePackageBuilder === "Yes" && {
      bin: {
        [answers.name]:
          answers.useTypeScript === "Yes" ? "dist/index.js" : "src/index.js",
      },
    }),
    scripts: {
      start: "node src/index.js",
      test: 'echo "Error: no test specified" && exit 1',
      ...(answers.useNodePackageBuilder === "Yes" && {
        github: 'git add -A && git commit -m "Building" && git push',
        publish: "npm run publish:patch",
        "publish:patch": `npm run github && node node_modules/build-a-npm/publish.js --patch --github --npmjs`,
        "publish:minor": `npm run github && node node_modules/build-a-npm/publish.js --minor --github --npmjs`,
        "publish:major": `npm run github && node node_modules/build-a-npm/publish.js --major --github --npmjs`,
        do: "node publish.js --patch --github --npmjs && npm run github",
      }),
      ...(answers.testFramework !== "None" && {
        test: `${answers.testFramework.toLowerCase()} --watchAll`,
      }),
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
    homepage:
      answers.homepage ||
      `https://github.com/${answers.githubUsername}/${
        answers.githubRepoName || answers.name
      }`,
    publishConfig: {
      access: answers.access,
      ...(isNpm && !isGitHub
        ? { registry: "https://registry.npmjs.org/" }
        : {}),
      ...(isGitHub && !isNpm
        ? { registry: "https://npm.pkg.github.com/" }
        : {}),
    },
    repository: isGitHub
      ? {
          type: "git",
          url: `git+https://github.com/${answers.githubUsername}/${
            answers.githubRepoName || answers.name
          }.git`,
        }
      : undefined,
    dependencies: {
      ...(answers.useNodePackageBuilder === "Yes" && {
        "@inquirer/prompts": "^5.0.7",
      }),
      ...answers.dependencies,
    },
    devDependencies: {
      ...(answers.useNodePackageBuilder === "Yes" && {
        "build-a-npm": "^0.3.22",
      }),
      ...(answers.useTypeScript === "Yes" && {
        typescript: "^5.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0",
        "ts-node": "latest",
        "@types/node": "latest",
      }),
      ...(answers.useESLint === "Yes" && { eslint: "^8.0.0" }),
      ...(answers.usePrettier === "Yes" && { prettier: "^3.0.0" }),
      ...(answers.testFramework === "Jest" && {
        jest: "latest",
        "@types/jest": "latest",
      }),
      ...(answers.testFramework === "Mocha" && {
        mocha: "latest",
        chai: "latest",
        "@types/chai": "latest",
      }),
      ...(answers.testFramework === "Vitest" && { vitest: "latest" }),
      ...(answers.useVitePress === "Yes" && { vitepress: "^1.0.0" }),
      ...answers.devDependencies,
    },
    ...(answers.useNodePackageBuilder === "Yes" && {
      files: ["index.js", "publish.js", "lib", "config.template.json"],
    }),
  };

  if (answers.moduleType === "ES Modules") {
    packageJson.type = "module";
  }

  logger.debug("Generated package.json:", packageJson);
  return JSON.stringify(packageJson, null, 2);
}

module.exports = { generatePackageJson };
