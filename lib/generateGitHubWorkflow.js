function generateGitHubWorkflow(answers) {
  const isNpm = ["npmjs", "Both"].includes(answers.publishTo);
  const registryUrl = isNpm
    ? "https://registry.npmjs.org/"
    : "https://npm.pkg.github.com/";

  return `
name: Publish Package
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  packages: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: '${registryUrl}'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.${
            isNpm ? "NPM_TOKEN" : "GITHUB_TOKEN"
          } }}
`;
}

module.exports = { generateGitHubWorkflow };
