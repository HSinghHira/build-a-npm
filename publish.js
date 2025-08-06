const fs = require("fs");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

let bumpType = args.find((arg) =>
  ["--patch", "--minor", "--major"].includes(arg)
);

if (!bumpType) {
  bumpType = "--patch";
  console.log("ℹ️  No version bump type specified, defaulting to --patch");
}

const publishToNpmjs = args.includes("--npmjs");
const publishToGithub = args.includes("--github");

// Step 1: Load and clone package.json
const originalJson = fs.readFileSync("package.json", "utf8");
const originalPkg = JSON.parse(originalJson);
const backupPkg = JSON.parse(originalJson); // Deep clone

// GitHub username from repository URL
const repoUrl = originalPkg.repository?.url || "";
const githubMatch = repoUrl.match(/github\.com[/:](.+?)\//);
const githubUsername = githubMatch ? githubMatch[1] : null;

if (publishToGithub && !githubUsername) {
  console.error("❌ Could not determine GitHub username from repository URL.");
  process.exit(1);
}

// Step 2: Version bump logic
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (type === "--major") return `${major + 1}.0.0`;
  if (type === "--minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const bumpedVersion = bumpVersion(originalPkg.version, bumpType);
console.log(`🔧 Bumping version: ${originalPkg.version} → ${bumpedVersion}`);

// Update version
originalPkg.version = bumpedVersion;
fs.writeFileSync("package.json", JSON.stringify(originalPkg, null, 2));

// Step 3: Publisher
function publishVariant(name, registry) {
  const tempPkg = {
    ...originalPkg,
    name,
    version: bumpedVersion,
    publishConfig: {
      registry,
      access: "public",
    },
    scripts: {},
  };

  fs.writeFileSync("package.json", JSON.stringify(tempPkg, null, 2));
  console.log(`\n📦 Publishing ${name}@${bumpedVersion} to ${registry}`);

  try {
    execSync(`npm publish --registry=${registry}`, { stdio: "inherit" });
    console.log(`✅ Published ${name}@${bumpedVersion} to ${registry}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to publish ${name} to ${registry}:`, err.message);
    return false;
  }
}

// Step 4: Publish to npmjs and GitHub
let success = true;

if (publishToNpmjs) {
  success =
    publishVariant(backupPkg.name, "https://registry.npmjs.org/") && success;
}

if (publishToGithub) {
  const scopedName = `@${githubUsername}/${backupPkg.name}`;
  success =
    publishVariant(scopedName, "https://npm.pkg.github.com/") && success;
}

// Step 5: Final handling
if (!success) {
  console.warn(
    "⚠️ One or more publishes failed. Reverting to original version..."
  );
  fs.writeFileSync("package.json", JSON.stringify(backupPkg, null, 2));
  console.log("🔄 package.json fully reverted.");
  process.exit(1);
} else {
  const finalPkg = {
    ...backupPkg,
    version: bumpedVersion,
  };
  fs.writeFileSync("package.json", JSON.stringify(finalPkg, null, 2));
  console.log(
    `\n🔄 package.json restored to original name with bumped version ${bumpedVersion}.`
  );
  console.log("✅ Publishing process completed successfully.");
}
