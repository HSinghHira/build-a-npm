const { execSync } = require("child_process");
const {
  getInquirer,
  colorize,
  fs,
  logger,
  simpleGit,
  retry,
} = require("./utils");

async function publish(bumpType, verbose) {
  logger.setVerbose(verbose);
  logger.info(`Starting publish process (bumpType: ${bumpType})`);

  try {
    if (!fs.existsSync("package.json")) {
      logger.error("No package.json found in the current directory");
      console.error(
        colorize("❌ No package.json found in the current directory.", "31")
      );
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    const isGitHub =
      packageJson.publishConfig?.registry?.includes("npm.pkg.github.com");
    const isNpm =
      packageJson.publishConfig?.registry?.includes("registry.npmjs.org");

    let versionBump = bumpType;
    if (!versionBump) {
      const git = simpleGit();
      const tags = await git.tags();
      const latestTag = tags.latest || "0.0.0";
      const commits = await git.log({ from: latestTag, to: "HEAD" });
      const hasBreaking = commits.all.some((commit) =>
        commit.message.includes("BREAKING CHANGE")
      );
      const hasFeature = commits.all.some((commit) =>
        commit.message.startsWith("feat")
      );
      const suggestedBump = hasBreaking
        ? "major"
        : hasFeature
        ? "minor"
        : "patch";
      logger.debug(`Suggested version bump: ${suggestedBump}`, {
        latestTag,
        commits,
      });

      const inquirer = await getInquirer();
      const { selectedBump } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedBump",
          message: `Select version bump (current: ${packageJson.version}, suggested: ${suggestedBump}):`,
          choices: ["patch", "minor", "major"],
          default: suggestedBump,
        },
      ]);
      versionBump = selectedBump;
    }

    logger.info(`Bumping version: ${versionBump}`);
    await retry(
      () => {
        execSync(`npm version ${versionBump} --no-git-tag-version`, {
          stdio: verbose ? "inherit" : "ignore",
        });
      },
      {
        retries: 3,
        onError: (err) =>
          logger.warn(`Version bump attempt failed: ${err.message}`),
      }
    );
    const updatedPackageJson = JSON.parse(
      fs.readFileSync("package.json", "utf-8")
    );
    const newVersion = updatedPackageJson.version;
    console.log(colorize(`✅ Version bumped to ${newVersion}`, "32"));

    if (isNpm) {
      logger.info("Publishing to npmjs");
      await retry(
        () => {
          execSync("npm publish", { stdio: verbose ? "inherit" : "ignore" });
        },
        {
          retries: 3,
          onError: (err) =>
            logger.warn(`npm publish attempt failed: ${err.message}`),
        }
      );
      console.log(colorize("✅ Published to npmjs", "32"));
    }

    if (isGitHub) {
      logger.info("Publishing to GitHub Packages");
      await retry(
        () => {
          execSync("npm publish --registry=https://npm.pkg.github.com", {
            stdio: verbose ? "inherit" : "ignore",
          });
        },
        {
          retries: 3,
          onError: (err) =>
            logger.warn(
              `GitHub Packages publish attempt failed: ${err.message}`
            ),
        }
      );
      console.log(colorize("✅ Published to GitHub Packages", "32"));
    }

    if (isGitHub && fs.existsSync(".git")) {
      logger.info("Committing and pushing changes");
      await retry(
        async () => {
          const git = simpleGit();
          await git.add(".");
          await git.commit(`Release v${newVersion}`);
          await git.addTag(`v${newVersion}`);
          await git.push();
          await git.pushTags();
        },
        {
          retries: 3,
          onError: (err) =>
            logger.warn(`Git push attempt failed: ${err.message}`),
        }
      );
      console.log(colorize("✅ Pushed changes and tags to repository", "32"));
    }

    console.log(colorize("🎉 Publish complete!", "1;36"));
  } catch (err) {
    logger.error(`Error in publish: ${err.message}`, err.stack);
    console.error(colorize("❌ Error:", "31"), err.message);
    process.exit(1);
  }
}

module.exports = { publish };
