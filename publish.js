const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

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
const publishToArtifactory = args.includes('--artifactory');
const publishToNexus = args.includes('--nexus');
const publishToVerdaccio = args.includes('--verdaccio');
const customRegistryUrl = args
  .find(arg => arg.startsWith('--custom='))
  ?.split('=')[1];

// Step 1: Load original package.json
const originalJson = fs.readFileSync('package.json', 'utf8');
const originalPkg = JSON.parse(originalJson);

// Clone a deep copy to restore later
const cloneDeep = obj => JSON.parse(JSON.stringify(obj));
const backupPkg = cloneDeep(originalPkg);

// Get GitHub username from repository field or .env
const repoUrl = originalPkg.repository?.url || '';
const githubMatch = repoUrl.match(/github\.com[/:](.+?)\//);
const githubUsername = githubMatch
  ? githubMatch[1]
  : process.env.GITHUB_USERNAME || null;

if (publishToGithub && !githubUsername) {
  console.error(
    '❌ Could not determine GitHub username from package.json "repository.url" or GITHUB_USERNAME in .env'
  );
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
function publishVariant(name, registry, token) {
  if (
    !registry ||
    registry.toLowerCase() === 'na' ||
    !token ||
    token.toLowerCase() === 'na'
  ) {
    console.log(`⏭️  Skipping ${name} due to missing registry URL or token`);
    return;
  }

  const modifiedPkg = {
    ...originalPkg,
    name,
    version: bumpedVersion,
    publishConfig: {
      registry,
      access: originalPkg.publishConfig?.access || 'public',
    },
    scripts: {}, // prevent infinite loops
  };

  fs.writeFileSync('package.json', JSON.stringify(modifiedPkg, null, 2));
  console.log(`\n📦 Publishing ${name}@${bumpedVersion} to ${registry}`);

  try {
    // Set registry and authentication token
    execSync(`npm config set registry ${registry}`, { stdio: 'pipe' });
    const registryHost = registry.replace(/^https?:\/\//, '');
    execSync(`npm config set //${registryHost}:_authToken ${token}`, {
      stdio: 'pipe',
    });
    execSync(`npm publish --registry=${registry}`, { stdio: 'inherit' });
    console.log(`✅ Published ${name}@${bumpedVersion} to ${registry}`);
  } catch (err) {
    console.error(
      `❌ Failed to publish ${name} to ${registry}: ${err.message}`
    );
  }
}

// Step 4: Perform Publishing
const registries = [
  {
    flag: publishToNpmjs,
    name: backupPkg.name,
    url: 'https://registry.npmjs.org/',
    token: process.env.NPM_TOKEN || 'NA',
  },
  {
    flag: publishToGithub,
    name: backupPkg.name.startsWith('@')
      ? backupPkg.name
      : githubUsername
        ? `@${githubUsername}/${backupPkg.name}`
        : backupPkg.name,
    url: 'https://npm.pkg.github.com/',
    token: process.env.GITHUB_TOKEN || 'NA',
  },
  {
    flag: publishToArtifactory,
    name: backupPkg.name,
    url: process.env.ARTIFACTORY_REGISTRY_URL || 'NA',
    token: process.env.ARTIFACTORY_TOKEN || 'NA',
  },
  {
    flag: publishToNexus,
    name: backupPkg.name,
    url: process.env.NEXUS_REGISTRY_URL || 'NA',
    token: process.env.NEXUS_TOKEN || 'NA',
  },
  {
    flag: publishToVerdaccio,
    name: backupPkg.name,
    url: process.env.VERDACCIO_REGISTRY_URL || 'NA',
    token: process.env.VERDACCIO_TOKEN || 'NA',
  },
  {
    flag: !!customRegistryUrl,
    name: backupPkg.name,
    url: customRegistryUrl || process.env.CUSTOM_REGISTRY_URL || 'NA',
    token: process.env.CUSTOM_REGISTRY_TOKEN || 'NA',
  },
];

registries.forEach(({ flag, name, url, token }) => {
  if (flag) {
    publishVariant(name, url, token);
  }
});

// Step 5: Restore original package.json with bumped version
const restoredPkg = {
  ...backupPkg,
  version: bumpedVersion,
};
fs.writeFileSync('package.json', JSON.stringify(restoredPkg, null, 2));
console.log(
  `\n🔄 package.json restored to original state with version ${bumpedVersion}.`
);
