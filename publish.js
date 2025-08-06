const fs = require('fs');
const { execSync } = require('child_process');

const args = process.argv.slice(2);

let bumpType = args.find(arg =>
  ['--patch', '--minor', '--major'].includes(arg)
);

// Default to patch if no bump type is specified
if (!bumpType) {
  bumpType = '--patch';
  console.log('ℹ️  No version bump type specified, defaulting to --patch');
}

const publishToNpmjs = args.includes('--npmjs');
const publishToGithub = args.includes('--github');

// Step 1: Load original package.json
const originalJson = fs.readFileSync('package.json', 'utf8');
const originalPkg = JSON.parse(originalJson);

// Clone a deep copy to restore later
const cloneDeep = obj => JSON.parse(JSON.stringify(obj));
const backupPkg = cloneDeep(originalPkg);

// Get GitHub username from repository field
const repoUrl = originalPkg.repository?.url || '';
const githubMatch = repoUrl.match(/github\.com[/:](.+?)\//);
const githubUsername = githubMatch ? githubMatch[1] : null;

if (publishToGithub && !githubUsername) {
  console.error('❌ Could not determine GitHub username from package.json "repository.url"');
  process.exit(1);
}

// Step 2: Bump version
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === '--major') return `${major + 1}.0.0`;
  if (type === '--minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`; // default to patch
}

const bumpedVersion = bumpVersion(originalPkg.version, bumpType);
console.log(`🔧 Bumping version: ${originalPkg.version} → ${bumpedVersion}`);

// Save bumped version to package.json (temp)
originalPkg.version = bumpedVersion;
fs.writeFileSync('package.json', JSON.stringify(originalPkg, null, 2));

// Step 3: Publish function
function publishVariant(name, registry) {
  const modifiedPkg = {
    ...originalPkg,
    name,
    version: bumpedVersion,
    publishConfig: {
      registry,
      access: 'public',
    },
    scripts: {}, // prevent infinite loops
  };

  fs.writeFileSync('package.json', JSON.stringify(modifiedPkg, null, 2));
  console.log(`\n📦 Publishing ${name}@${bumpedVersion} to ${registry}`);

  try {
    execSync(`npm publish --registry=${registry}`, { stdio: 'inherit' });
    console.log(`✅ Published ${name}@${bumpedVersion} to ${registry}`);
  } catch (err) {
    console.error(`❌ Failed to publish ${name}:`, err.message);
  }
}

// Step 4: Perform Publishing
if (publishToNpmjs) {
  publishVariant(backupPkg.name, 'https://registry.npmjs.org/');
}

if (publishToGithub) {
  const scopedName = `@${githubUsername}/${backupPkg.name}`;
  publishVariant(scopedName, 'https://npm.pkg.github.com/');
}

// Step 5: Restore original package.json with bumped version
const restoredPkg = {
  ...backupPkg,
  version: bumpedVersion,
};
fs.writeFileSync('package.json', JSON.stringify(restoredPkg, null, 2));
console.log(`\n🔄 package.json restored to original state with version ${bumpedVersion}.`);
console.log('✅ Publishing process completed successfully.');