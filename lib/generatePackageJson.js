const { logger } = require("./utils");

function generatePackageJson(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const isNpm = ["npmjs", "Both"].includes(answers.publishTo);
  const packageManager = answers.packageManager || "npm";

  const packageJson = {
    name: answers.name,
    version: answers.version,
    description: answers.description || "",
    main: answers.useTypeScript === "Yes" ? "dist/index.js" : "index.js",
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
      git: "git add -A && git commit -m 'Update' && git push",
      publish: `${packageManager} run publish:patch`,
      "publish:patch": `${packageManager} run git && node node_modules/build-a-npm/publish.js --patch --github --npmjs`,
      "publish:minor": `${packageManager} run git && node node_modules/build-a-npm/publish.js --minor --github --npmjs`,
      "publish:major": `${packageManager} run git && node node_modules/build-a-npm/publish.js --major --github --npmjs`,
      pub: `${packageManager} run publish:patch`,
      "pub:pat": `${packageManager} run git && node node_modules/build-a-npm/publish.js --patch --github --npmjs`,
      "pub:min": `${packageManager} run git && node node_modules/build-a-npm/publish.js --minor --github --npmjs`,
      "pub:maj": `${packageManager} run git && node node_modules/build-a-npm/publish.js --major --github --npmjs`,
      "nogit:patch":
        "node node_modules/build-a-npm/publish.js --patch --github --npmjs",
      "nogit:minor":
        "node node_modules/build-a-npm/publish.js --minor --github --npmjs",
      "nogit:major":
        "node node_modules/build-a-npm/publish.js --major --github --npmjs",
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
          url: `git+https://github.com/${answers.githubUsername}/${answers.githubRepoName}.git`,
        }
      : undefined,
    homepage: answers.homepage || undefined,
    dependencies: answers.dependencies || {},
    devDependencies: {
      "build-a-npm": "*",
    },
  };

  if (isGitHub && isNpm) {
    packageJson.publishConfig = {
      access: answers.access,
    };
    packageJson[
      "publish:github"
    ] = `${packageManager} run build-a-npm:publish -- --bump none --github`;
  }

  if (answers.useTypeScript === "Yes") {
    packageJson.types = "dist/index.d.ts";
    packageJson.scripts.build = `${
      packageManager === "pnpm"
        ? "pnpm tsc"
        : packageManager === "yarn"
        ? "yarn tsc"
        : "tsc"
    }`;
    packageJson.devDependencies.typescript = "*";
  }

  if (answers.useESLint === "Yes") {
    packageJson.scripts.lint = "eslint .";
    packageJson.devDependencies.eslint = "*";
    if (answers.useTypeScript === "Yes") {
      packageJson.devDependencies["@typescript-eslint/parser"] = "*";
      packageJson.devDependencies["@typescript-eslint/eslint-plugin"] = "*";
    }
  }

  if (answers.usePrettier === "Yes") {
    packageJson.scripts.format = "prettier --write .";
    packageJson.devDependencies.prettier = "*";
  }

  if (answers.testFramework !== "None") {
    packageJson.scripts.test = answers.testFramework.toLowerCase();
    packageJson.devDependencies[answers.testFramework.toLowerCase()] = "latest";
    if (answers.testFramework === "Mocha") {
      packageJson.devDependencies.chai = "latest";
    }
    if (answers.useTypeScript === "Yes") {
      packageJson.devDependencies["ts-node"] = "latest";
      packageJson.devDependencies["@types/node"] = "latest";
      if (answers.testFramework === "Jest") {
        packageJson.devDependencies["@types/jest"] = "latest";
      } else if (answers.testFramework === "Mocha") {
        packageJson.devDependencies["@types/chai"] = "latest";
      }
    }
  }

  if (answers.moduleType === "ES Modules") {
    packageJson.type = "module";
  }

  logger.debug("Generated package.json:", packageJson);
  return JSON.stringify(packageJson, null, 2);
}

module.exports = { generatePackageJson };
