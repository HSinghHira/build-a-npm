const { logger } = require("./utils");

function generateTestFile(answers) {
  logger.debug("Generating src/index.test.js");
  const isJestOrVitest = ["Jest", "Vitest"].includes(answers.testFramework);
  const content =
    answers.useTypeScript === "Yes"
      ? `
${
  isJestOrVitest
    ? `import { describe, it, expect } from "${answers.testFramework.toLowerCase()}";`
    : `import { describe, it } from "mocha";\nimport { expect } from "chai";`
}
import hello from "./index";

describe("${answers.name}", () => {
  it("should return a greeting", () => {
    expect(hello()).to.equal("Hello from ${answers.name}!");
  });
});
`
      : `
${
  isJestOrVitest
    ? `const { describe, it, expect } = require("${answers.testFramework.toLowerCase()}");`
    : `const { describe, it } = require("mocha");\nconst { expect } = require("chai");`
}
const hello = require("./index");

describe("${answers.name}", () => {
  it("should return a greeting", () => {
    expect(hello()).to.equal("Hello from ${answers.name}!");
  });
});
`;
  return content;
}

module.exports = { generateTestFile };
