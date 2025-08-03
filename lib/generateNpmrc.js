function generateNpmrc(githubUsername, githubToken) {
  if (!githubUsername || !githubToken || githubToken.toLowerCase() === "na")
    return "";
  return `//npm.pkg.github.com/:_authToken=${githubToken}
@${githubUsername}:registry=https://npm.pkg.github.com/`;
}

module.exports = { generateNpmrc };