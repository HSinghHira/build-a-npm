function generateSampleAnswers() {
  return {
    useNewDir: "Yes, same as my Package Name",
    projectDir: "sample-package",
    useMonorepo: "No",
    publishTo: "Both",
    access: "public",
    createGitHubWorkflow: "Yes",
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
    useTypeScript: "No",
    useESLint: "No",
    usePrettier: "No",
    customScripts: {},
  };
}

module.exports = { generateSampleAnswers };
