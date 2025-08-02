function generateSampleAnswers() {
  return {
    useNewDir: "Yes",
    projectDir: "sample-package",
    useMonorepo: false,
    publishTo: "Both",
    access: "public",
    createGitHubWorkflow: true,
    name: "sample-package",
    version: "0.0.1",
    githubUsername: "sampleuser",
    githubRepoName: "sample-package",
    githubToken: "NA",
    description: "A sample Node.js package",
    authorName: "Sample Author",
    authorEmail: "sample@example.com",
    authorUrl: "https://example.com",
    homepage: "https://example.com/sample-package",
    keywords: ["sample", "node", "package"],
    license: "MIT",
    useTypeScript: false,
    useESLint: false,
    usePrettier: false,
    customScripts: {},
  };
}

module.exports = { generateSampleAnswers };
