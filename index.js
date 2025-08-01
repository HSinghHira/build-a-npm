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

  if (args.includes("init")) {
    await init(noGit, useSample, packageVersion);
  } else if (args.includes("upgrade")) {
    await upgrade(packageVersion);
  } else {
    console.log(colorize("Usage: npx build-a-npm <command>", "36"));
    console.log(
      colorize("Available commands: init [--no-git] [--sample], upgrade", "36")
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
