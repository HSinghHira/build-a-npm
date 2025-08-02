function generateCircleCIWorkflow(answers) {
  const isGitHub = ["GitHub Packages", "Both"].includes(answers.publishTo);
  const isNpm = ["npmjs", "Both"].includes(answers.publishTo);
  const packageManager = answers.packageManager || "npm";
  const installCommand = packageManager === "pnpm" ? "pnpm install" : packageManager === "yarn" ? "yarn install" : "npm ci";
  const buildCommand = answers.useTypeScript === "Yes" ? `${packageManager} run build` : "echo 'No build step'";
  const testCommand = answers.testFramework !== "None" ? `${packageManager} run test` : "echo 'No tests'";

  return `version: 2.1

jobs:
  publish:
    docker:
      - image: cimg/node:current
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: ${installCommand}
      - run:
          name: Build
          command: ${buildCommand}
      - run:
          name: Test
          command: ${testCommand}
      ${isNpm ? `- run:
          name: Setup npm registry
          command: echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc` : ""}
      ${isGitHub ? `- run:
          name: Setup GitHub Packages
          command: echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> .npmrc` : ""}
      - run:
          name: Publish
          command: ${packageManager} run publish

workflows:
  version: 2
  publish-workflow:
    jobs:
      - publish:
          filters:
            branches:
              only: main
`;
}

module.exports = { generateCircleCIWorkflow };