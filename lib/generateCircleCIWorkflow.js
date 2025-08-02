const { logger } = require("./utils");

function generateCircleCIWorkflow(answers) {
  logger.debug("Generating .circleci/config.yml");
  const content = `
version: 2.1
jobs:
  publish:
    docker:
      - image: cimg/node:20.10
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Publish to npmjs
          command: npm publish
          environment:
            NPM_TOKEN: \${NPM_TOKEN}
      - run:
          name: Publish to GitHub Packages
          command: npm publish
          environment:
            NODE_AUTH_TOKEN: \${GITHUB_TOKEN}
workflows:
  version: 2
  publish:
    jobs:
      - publish:
          filters:
            branches:
              only: main
`;
  return content;
}

module.exports = { generateCircleCIWorkflow };
