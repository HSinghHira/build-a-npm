#!/usr/bin/env node

const { init } = require("./lib/init");
const { upgrade } = require("./lib/upgrade");
const { colorize } = require("./lib/utils");

// Dynamically resolve package.json
let packageVersion = "unknown";
try {
  const packageJsonPath = require.resolve("build-a-npm/package.json");
  packageVersion = require(packageJsonPath).version;
} catch (err) {
  console.warn("⚠️ Could not load package version:", err.message);
}

async function main() {
  const args = process.argv.slice(2);
  const noGit = args.includes("--no-git");
  const useSample = args.includes("--sample");
  const verbose = args.includes("--verbose");
  const configIndex = args.indexOf("--config");
  const configPath = configIndex !== -1 ? args[configIndex + 1] : null;

  if (args.includes("init")) {
    await init(noGit, useSample, packageVersion, verbose, configPath);
  } else if (args.includes("upgrade")) {
    await upgrade(packageVersion, verbose);
  } else {
    console.log(colorize("Usage: npx build-a-npm <command>", "36"));
    console.log(
      colorize(
        "Available commands: init [--no-git] [--sample] [--verbose] [--config <path>], upgrade [--verbose]",
        "36"
      )
    );
    console.log(
      colorize('Run "build-a-npm init" to create a new Node package.', "36")
    );
    console.log(
      colorize(
        'Run "build-a-npm init --sample" to create a package with sample data.',
        "36"
      )
    );
    console.log(
      colorize(
        'Run "build-a-npm init --config <path>" to use a configuration file.',
        "36"
      )
    );
    console.log(
      colorize(
        'Run "build-a-npm upgrade" to update an existing package with new features.',
        "36"
      )
    );
    console.log(
      colorize(
        "Use --no-git with init to skip git repository initialization.",
        "36"
      )
    );
    console.log(colorize("Use --verbose to enable detailed logging.", "36"));
    process.exit(1);
  }
}

// Run the main function
main().catch((err) => {
  console.error(colorize("❌ Error:", "31"), err.message);
  console.error(
    colorize(
      "💡 Check your file permissions, network connection, or try running the command again.",
      "33"
    )
  );
  process.exit(1);
});

module.exports = {
  init,
  upgrade,
};
