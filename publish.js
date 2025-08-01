const fs = require("fs");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

const isPatch = args.includes("--patch");
const isMinor = args.includes("--minor");
const isMajor = args.includes("--major");

const publishToNpmjs = args.includes("--npmjs");
const publishToGithub = args.includes("--github");

if (!isPatch && !isMinor && !isMajor) {
  console.error(
    "❌ No version bump type provided. Use --patch, --minor, or --major."
  );
  process.exit(1);
}

function bumpVersion(version) {
  const parts = version.split(".").map(Number);
  if (isMajor) {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (isMinor) {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }
  return parts.join(".");
}

// Load and bump
const originalJson = fs.readFileSync("package.json", "utf8");
const originalPkg = JSON.parse(originalJson);
const newVersion = bumpVersion(originalPkg.version);

console.log(`🔧 Bumping version: ${originalPkg.version} → ${newVersion}`);
originalPkg.version = newVersion;
fs.writeFileSync("package.json", JSON.stringify(originalPkg, null, 2));

// Publish function
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
    execSync(`npm publish --registry=${registry}`, { stdio: "inherit" });
    console.log(`✅ Published ${name}@${newVersion} to ${registry}`);
  } catch (err) {
    console.error(`❌ Failed to publish ${name}:`, err.message);
  }
}

// Publish
if (publishToNpmjs) {
  publishVariant("build-a-npm", "https://registry.npmjs.org/");
}

if (publishToGithub) {
  publishVariant("@hsinghhira/build-a-npm", "https://npm.pkg.github.com/");
}

// Restore original package.json
fs.writeFileSync("package.json", originalJson);
console.log("\n🔄 package.json restored to original state.");
