const { logger } = require("./utils");

function generateGitLabWorkflow(answers) {
  logger.debug("Generating .gitlab-ci.yml");
  const content = `
stages:
  - publish

publish:
  stage: publish
  image: node:20
  script:
    - npm ci
    - npm publish
  variables:
    NPM_TOKEN: $NPM_TOKEN
    NODE_AUTH_TOKEN: $GITLAB_TOKEN
  only:
    - main
`;
  return content;
}

module.exports = { generateGitLabWorkflow };
