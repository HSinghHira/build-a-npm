function generateNpmIgnore(useTypeScript) {
  const baseIgnores = [
    "node_modules/",
    ".gitignore",
    ".npmrc",
    "build-a-npm.log",
    ".build-a-npm-state.json",
    "test/",
    "*.md",
    ".github/",
    ".gitlab-ci.yml",
    ".circleci/",
  ];
  if (useTypeScript) {
    baseIgnores.push("src/", "!dist/");
  }
  return baseIgnores.join("\n") + "\n";
}

module.exports = { generateNpmIgnore };