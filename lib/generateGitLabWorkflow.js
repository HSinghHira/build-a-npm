function generateGitLabWorkflow(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const isNpm = ["npmjs", "Both"].includes(answers.publishTo);
  const packageManager = answers.packageManager || "npm";
  const installCommand = packageManager === "pnpm" ? "pnpm install" : packageManager === "yarn" ? "yarn install" : "npm ci";
  const buildCommand = answers.useTypeScript === "Yes" ? `${packageManager} run build` : "echo 'No build step'";
  const testCommand = answers.testFramework !== "None" ? `${packageManager} run test` : "echo 'No tests'";

  return `image: node:latest

stages:
  - publish

publish:
  stage: publish
  script:
    - ${installCommand}
    - ${buildCommand}
    - ${testCommand}
    ${isNpm ? `- echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc` : ""}
    ${isGitHub ? `- echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc` : ""}
    - ${packageManager} run publish
  only:
    - main
`;
}

module.exports = { generateGitLabWorkflow };