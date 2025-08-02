const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const fetch = require("node-fetch").default;
const { Octokit } = require("@octokit/rest");
const simpleGit = require("simple-git");
const logger = require("./logger");

async function getInquirer() {
  return (await import("@inquirer/prompts")).default;
}

function colorize(text, color) {
  return `\x1b[${color}m${text}\x1b[0m`;
}

function mergeConfigWithDefaults(config, defaults) {
  return { ...defaults, ...config };
}

const configSchema = {
  type: "object",
  properties: {
    useNewDir: {
      type: "string",
      enum: ["Yes, same as my Package Name", "Yes, a Custom Name", "No"],
    },
    projectDir: { type: "string" },
    useMonorepo: { type: "string", enum: ["Yes", "No"] },
    monorepoRoot: { type: "string" },
    packageManager: { type: "string", enum: ["npm", "pnpm", "yarn"] },
    publishTo: { type: "string", enum: ["npmjs", "GitHub Packages", "Both"] },
    access: { type: "string", enum: ["public", "private"] },
    createGitHubWorkflow: { type: "string", enum: ["Yes", "No"] },
    createGitHubRepo: { type: "string", enum: ["Yes", "No"] },
    ciProvider: {
      type: "string",
      enum: ["GitHub Actions", "GitLab CI", "CircleCI", "None"],
    },
    name: { type: "string", pattern: "^[a-z0-9-@][a-z0-9-/]*$" },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    moduleType: { type: "string", enum: ["ES Modules", "CommonJS"] },
    githubUsername: { type: "string" },
    githubRepoName: { type: "string" },
    githubToken: { type: "string" },
    description: { type: "string" },
    authorName: { type: "string" },
    authorEmail: { type: "string", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
    authorUrl: { type: "string" },
    homepage: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    license: {
      type: "string",
      enum: ["MIT", "ISC", "Apache-2.0", "GPL-3.0", "Unlicense"],
    },
    useTypeScript: { type: "string", enum: ["Yes", "No"] },
    useESLint: { type: "string", enum: ["Yes", "No"] },
    usePrettier: { type: "string", enum: ["Yes", "No"] },
    testFramework: {
      type: "string",
      enum: ["Jest", "Mocha", "Vitest", "None"],
    },
    dependencies: { type: "object", additionalProperties: { type: "string" } },
    devDependencies: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    customScripts: { type: "object", additionalProperties: { type: "string" } },
  },
  required: ["name", "version", "license"],
};

function validateConfig(config) {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(configSchema);
  const valid = validate(config);
  return {
    valid,
    errors: validate.errors ? validate.errors.map((err) => err.message) : [],
  };
}

async function createGitHubRepo(username, repoName, token, access) {
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: access === "private",
    });
    logger.info(`Created GitHub repository: ${username}/${repoName}`);
  } catch (err) {
    logger.error(`Failed to create GitHub repository: ${err.message}`);
    throw err;
  }
}

async function fetchNpmPackage(packageName) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    return response.ok;
  } catch (err) {
    logger.warn(`Failed to validate package ${packageName}: ${err.message}`);
    return false;
  }
}

async function retry(fn, options = { retries: 3, onError: () => {} }) {
  let lastError;
  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      options.onError(err);
      if (i < options.retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

module.exports = {
  getInquirer,
  fs,
  path,
  colorize,
  mergeConfigWithDefaults,
  logger,
  validateConfig,
  createGitHubRepo,
  fetchNpmPackage,
  simpleGit,
  retry,
};
