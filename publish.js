const fs = require("fs");
const { execSync } = require("child_process");

async function main() {
  const args = process.argv.slice(2);

  let bumpType = args.find((arg) =>
    ["--patch", "--minor", "--major"].includes(arg)
  );

  // Prompt for bump type if not specified
  if (!bumpType) {
    const inquirer = await import("inquirer").then((m) => m.default);
    const { type } = await inquirer.prompt([
      {
        type: "list",
        name: "type",
        message: "Select version bump type:",
        choices: ["patch", "minor", "major"],
        default: "patch",
      },
    ]);
    bumpType = `--${type}`;
    console.log(`ℹ️  Version bump type selected: ${bumpType}`);
  }

  const publishToNpmjs = args.includes("--npmjs");
  const publishToGithub = args.includes("--github");

  // Step 1: Load original package.json
  const originalJson = fs.readFileSync("package.json", "utf8");
  const originalPkg = JSON.parse(originalJson);

  // Step 2: Validate version against npm registry
  try {
    if (publishToNpmjs) {
      const npmVersion = execSync(`npm view ${originalPkg.name} version`, {
        encoding: "utf8",
      }).trim();
      if (npmVersion === originalPkg.version) {
        console.log(
          `ℹ️  Current version ${originalPkg.version} already exists on npm. Bumping version.`
        );
      }
    }
  } catch (err) {
    console.log(
      `ℹ️  Package not found on npm or no version exists. Proceeding with current version.`
    );
  }

  // Step 3: Bump version
  function bumpVersion(version, type) {
    const [major, minor, patch] = version.split(".").map(Number);
    if (type === "--major") return `${major + 1}.0.0`;
    if (type === "--minor") return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`; // default to patch
  }

  const bumpedVersion = bumpVersion(originalPkg.version, bumpType);
  console.log(`🔧 Bumping version: ${originalPkg.version} → ${bumpedVersion}`);

  // Save bumped version to package.json
  originalPkg.version = bumpedVersion;
  fs.writeFileSync("package.json", JSON.stringify(originalPkg, null, 2));

  // Step 4: Publish function
  function publishVariant(name, registry) {
    const modifiedPkg = {
      ...originalPkg,
      name,
      version: bumpedVersion,
      publishConfig: {
        registry,
        access: originalPkg.publishConfig?.access || "public",
      },
      // Remove scripts to prevent infinite loops
      scripts: {},
    };

    fs.writeFileSync("package.json", JSON.stringify(modifiedPkg, null, 2));
    console.log(`\n📦 Publishing ${name}@${bumpedVersion} to ${registry}`);

    try {
      execSync(`npm publish --registry=${registry}`, { stdio: "inherit" });
      console.log(`✅ Published ${name}@${bumpedVersion} to ${registry}`);
    } catch (err) {
      console.error(`❌ Failed to publish ${name}:`, err.message);
    }
  }

  // Step 5: Perform Publishing
  if (publishToNpmjs) {
    publishVariant(
      originalPkg.name.startsWith("@") ? originalPkg.name : "build-a-npm",
      "https://registry.npmjs.org/"
    );
  }

  if (publishToGithub) {
    publishVariant(
      `@${originalPkg.name.split("/")[1] || originalPkg.name}`,
      "https://npm.pkg.github.com/"
    );
  }

  // Step 6: Restore original package.json but keep the bumped version
  const restoredPkg = {
    ...originalPkg,
    version: bumpedVersion, // Keep the new version
  };
  fs.writeFileSync("package.json", JSON.stringify(restoredPkg, null, 2));
  console.log(
    `\n🔄 package.json restored to original state with version ${bumpedVersion}.`
  );
  console.log("✅ Publishing process completed successfully.");
  console.log("🚀 Ready for the next steps!");
}

main().catch((err) => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
