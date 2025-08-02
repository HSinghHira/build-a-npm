function generatePackageJson(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const repositoryUrl = isGitHub
    ? `https://github.com/${answers.githubUsername}/${answers.githubRepoName}.git`
    : answers.repositoryUrl
    ? answers.repositoryUrl.endsWith(".git")
      ? answers.repositoryUrl
      : answers.repositoryUrl + ".git"
    : "";

  const bugsUrl = repositoryUrl
    ? repositoryUrl.replace(".git", "") + "/issues"
    : "";
  const packageName =
    isGitHub && !answers.name.startsWith("@")
      ? `@${answers.githubUsername}/${answers.name}`
      : answers.name;

  const packageJson = {
    name: packageName,
    version: answers.version,
    author: {
      name: answers.authorName,
      email: answers.authorEmail,
      url: answers.authorUrl,
    },
    description: answers.description,
    main: answers.useTypeScript ? "dist/index.js" : "index.js",
    types: answers.useTypeScript ? "dist/index.d.ts" : undefined,
    license: answers.license,
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
      publish: "npm run publish:patch",
      "publish:patch": `node node_modules/build-a-npm/publish.js --patch${
        isGitHub ? " --github --npmjs" : " --npmjs"
      }`,
      "publish:minor": `node node_modules/build-a-npm/publish.js --minor${
        isGitHub ? " --github --npmjs" : " --npmjs"
      }`,
      "publish:major": `node node_modules/build-a-npm/publish.js --major${
        isGitHub ? " --github --npmjs" : " --npmjs"
      }`,
      ...(answers.useTypeScript ? { build: "tsc" } : {}),
      ...(answers.useESLint ? { lint: "eslint ." } : {}),
      ...(answers.usePrettier ? { format: "prettier --write ." } : {}),
      ...answers.customScripts,
    },
    dependencies: {
      inquirer: "*",
    },
    devDependencies: {
      "build-a-npm": "*",
      ...(answers.useTypeScript ? { typescript: "*" } : {}),
      ...(answers.useESLint
        ? {
            eslint: "*",
            "eslint-config-standard": "*",
            "eslint-plugin-import": "*",
            "eslint-plugin-node": "*",
            "eslint-plugin-promise": "*",
          }
        : {}),
      ...(answers.usePrettier ? { prettier: "*" } : {}),
    },
  };

  if (isGitHub) {
    packageJson.scripts.github =
      'git add -A && git commit -m "Building" && git push';
    packageJson.scripts.publish = "npm run github && npm run publish:patch";
  }

  if (answers.useMonorepo) {
    packageJson.workspaces = ["packages/*"];
  }

  if (repositoryUrl) {
    packageJson.repository = {
      type: "git",
      url: `git+${repositoryUrl}`,
    };
    packageJson.bugs = { url: bugsUrl };
  }

  if (answers.homepage) packageJson.homepage = answers.homepage;
  if (answers.keywords.length) packageJson.keywords = answers.keywords;
  packageJson.publishConfig = {
    registry: isGitHub
      ? "https://npm.pkg.github.com/"
      : "https://registry.npmjs.org/",
    access: answers.access,
  };

  // Remove empty fields to keep package.json clean
  if (!packageJson.author.email) delete packageJson.author.email;
  if (!packageJson.author.url) delete packageJson.author.url;
  if (!packageJson.description) delete packageJson.description;
  if (!packageJson.homepage) delete packageJson.homepage;
  if (!packageJson.keywords || !packageJson.keywords.length)
    delete packageJson.keywords;
  if (!packageJson.types) delete packageJson.types;

  return JSON.stringify(packageJson, null, 2);
}

module.exports = { generatePackageJson };
