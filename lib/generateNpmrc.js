function generateNpmrc(githubUsername, githubToken, createGitHubPages) {
  if (!githubUsername || !githubToken || githubToken.toLowerCase() === 'na') {
    return createGitHubPages
      ? '# .npmrc for GitHub Pages (no token provided; manual configuration may be needed for GitHub Actions)'
      : '';
  }
  return `//npm.pkg.github.com/:_authToken=${githubToken}
@${githubUsername}:registry=https://npm.pkg.github.com/`;
}

module.exports = { generateNpmrc };
