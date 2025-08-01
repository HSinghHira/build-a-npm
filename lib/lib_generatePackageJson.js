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
    main: "index.js",
    license: answers.license,
    scripts: {
      publish: isGitHub
        ? "npm run publish:patch && npm run github"
        : "npm run publish:patch",
      "publish:patch": `node node_modules/build-a-npm/publish.js ${
        isGitHub ? "--github --npmjs" : "--npmjs"
      }`,
      "publish:minor": `node node_modules/build-a-npm/publish.js ${
        isGitHub ? "--github --npmjs" : "--npmjs"
      } --minor`,
      "publish:major": `node node_modules/build-a-npm/publish.js ${
        isGitHub ? "--github --npmjs" : "--npmjs"
      } --major`,
    },
    dependencies: {
      inquirer: "*",
    },
    devDependencies: {
      "build-a-npm": "*",
    },
  };

  if (isGitHub) {
    packageJson.scripts.github =
      'git add -A && git commit -m "Building" && git push';
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
  if (isGitHub) {
    packageJson.publishConfig = {
      registry: "https://npm.pkg.github.com/",
      access: "public",
    };
  } else {
    packageJson.publishConfig = {
      registry: "https://registry.npmjs.org/",
      access: "public",
    };
  }

  // Remove empty fields to keep package.json clean
  if (!packageJson.author.email) delete packageJson.author.email;
  if (!packageJson.author.url) delete packageJson.author.url;
  if (!packageJson.description) delete packageJson.description;
  if (!packageJson.homepage) delete packageJson.homepage;
  if (!packageJson.keywords || !packageJson.keywords.length)
    delete packageJson.keywords;

  return JSON.stringify(packageJson, null, 2);
}

module.exports = { generatePackageJson };