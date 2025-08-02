function generateTestFile(testFramework, useTypeScript, useESM) {
  const extension = useTypeScript ? "ts" : "js";
  const importSyntax = useESM ? "import" : "const";
  const exportSyntax = useESM ? "" : "module.exports = { example };";

  let content = "";
  if (testFramework === "Jest") {
    content = useESM
      ? `import { example } from '../${useTypeScript ? "src/" : ""}index.${extension}';

describe('Example', () => {
  test('should work', () => {
    expect(example()).toBe('Hello, World!');
  });
});
`
      : `const { example } = require('../${useTypeScript ? "src/" : ""}index.${extension}');

describe('Example', () => {
  test('should work', () => {
    expect(example()).toBe('Hello, World!');
  });
});

${exportSyntax}`;
  } else if (testFramework === "Mocha") {
    content = useESM
      ? `import { expect } from 'chai';
import { example } from '../${useTypeScript ? "src/" : ""}index.${extension}';

describe('Example', () => {
  it('should work', () => {
    expect(example()).to.equal('Hello, World!');
  });
});
`
      : `const { expect } = require('chai');
const { example } = require('../${useTypeScript ? "src/" : ""}index.${extension}');

describe('Example', () => {
  it('should work', () => {
    expect(example()).to.equal('Hello, World!');
  });
});

${exportSyntax}`;
  } else if (testFramework === "Vitest") {
    content = useESM
      ? `import { describe, it, expect } from 'vitest';
import { example } from '../${useTypeScript ? "src/" : ""}index.${extension}';

describe('Example', () => {
  it('should work', () => {
    expect(example()).toBe('Hello, World!');
  });
});
`
      : `const { describe, it, expect } = require('vitest');
const { example } = require('../${useTypeScript ? "src/" : ""}index.${extension}');

describe('Example', () => {
  it('should work', () => {
    expect(example()).toBe('Hello, World!');
  });
});

${exportSyntax}`;
  }

  return content;
}

module.exports = { generateTestFile };