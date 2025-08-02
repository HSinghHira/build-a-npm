const fs = require("fs");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

// ⛔ Prevent recursive execution
if (process.env.SKIP_PUBLISH === "true") {
  console.log("🛑 Skipping publish: recursive execution detected.");
  process.exit(0);
}

// ⛔ Prevent loop if last commit was a version bump
const lastCommitMessage = execSync("git log -1 --pretty=%B").toString().trim();
if (/^Bump version to/.test(lastCommitMessage)) {
  console.log("🛑 Skipping publish: last commit was a version bump.");
  process.exit(0);
}

// 🧩 Parse flags
const bumpType = args.find((arg) =>
  ["--patch", "--minor", "--major"].includes(arg)
);
const publishToNpmjs = args.includes("--npmjs");
const publishToGithub = args.includes("--github");
const restoreOriginal = args.includes("--restore");

if (!bumpType) {
  console.error(
    "❌ Missing version bump type. Use --patch, --minor, or --major."
  );
  process.exit(1);
}

// 📦 Read and bump version
const originalJson = fs.readFileSync("package.json", "utf8");
const originalPkg = JSON.parse(originalJson);

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (type === "--major") return `${major + 1}.0.0`;
  if (type === "--minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const newVersion = bumpVersion(originalPkg.version, bumpType);
console.log(`🔧 Bumping version: ${originalPkg.version} → ${newVersion}`);

originalPkg.version = newVersion;
fs.writeFileSync("package.json", JSON.stringify(originalPkg, null, 2));

// 🛠️ Publish function
function publishVariant(name, registry) {
  const pkg = {
    ...originalPkg,
    name,
    version: newVersion,
    publishConfig: {
      registry,
      access: "public",
    },
  };

  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
  console.log(`\n📦 Publishing ${name}@${newVersion} to ${registry}`);

  try {
    execSync(`npm publish --registry=${registry}`, {
      stdio: "inherit",
      env: { ...process.env, SKIP_PUBLISH: "true" },
    });
    console.log(`✅ Published ${name}@${newVersion} to ${registry}`);
  } catch (err) {
    console.error(`❌ Failed to publish ${name}:`, err.message);
  }
}

// 🚀 Run publishes
if (publishToNpmjs) {
  publishVariant("build-a-npm", "https://registry.npmjs.org/");
}
if (publishToGithub) {
  publishVariant("@hsinghhira/build-a-npm", "https://npm.pkg.github.com/");
}

// 📝 Auto-commit version bump (with skip ci)
try {
  execSync(`git config user.name "github-actions"`);
  execSync(`git config user.email "actions@github.com"`);

  execSync(`git add -A`);
  execSync(`git commit -m "Bump version to ${newVersion} [skip ci]"`);
  execSync(`git push`);
  console.log(`📤 Committed and pushed version bump to ${newVersion}`);
} catch (err) {
  console.warn(`⚠️ Could not commit/push version bump: ${err.message}`);
}

// 🔁 Restore or keep bumped version
if (restoreOriginal) {
  fs.writeFileSync("package.json", originalJson);
  console.log("\n🔄 package.json restored to original state.");
} else {
  console.log(`\n📁 package.json updated to bumped version: ${newVersion}`);
}
