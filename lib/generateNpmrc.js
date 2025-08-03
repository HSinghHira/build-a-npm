function generateNpmrc(githubUsername, githubRepoToken) {
  if (
    !githubUsername ||
    !githubRepoToken ||
    githubRepoToken.toLowerCase() === 'na'
  ) {
    return '';
  }
  return `//npm.pkg.github.com/:_authToken=${githubRepoToken}
@${githubUsername}:registry=https://npm.pkg.github.com/`;
}

module.exports = { generateNpmrc };
