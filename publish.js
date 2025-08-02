const fs = require("fs");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

const bumpType = args.find((arg) =>
  ["--patch", "--minor", "--major"].includes(arg)
);
const publishToNpmjs = args.includes("--npmjs");
const publishToGithub = args.includes("--github");

if (!bumpType) {
  console.error(
    "❌ Missing version bump type. Use --patch, --minor, or --major."
  );
  process.exit(1);
}

// Step 1: Load original package.json
const originalJson = fs.readFileSync("package.json", "utf8");
const originalPkg = JSON.parse(originalJson);

// Step 2: Bump version
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

// Step 3: Publish function
function publishVariant(name, registry) {
  const modifiedPkg = {
    ...originalPkg,
    name,
    version: bumpedVersion,
    publishConfig: {
      registry,
      access: "public",
    },
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

// Step 4: Perform Publishing
if (publishToNpmjs) {
  publishVariant("build-a-npm", "https://registry.npmjs.org/");
}

if (publishToGithub) {
  publishVariant("@hsinghhira/build-a-npm", "https://npm.pkg.github.com/");
}

// Step 5: Restore original package.json
fs.writeFileSync("package.json", originalJson);
console.log("\n🔄 package.json restored to original state.");
