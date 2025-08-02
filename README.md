# @hsinghhira/build-a-npm

A powerful CLI tool to scaffold and publish Node.js packages with automatic version bumping and support for both npmjs.org and GitHub Packages.

## Features

- **Interactive Package Creation**: Prompt-based setup for creating new Node packages with customizable details like package name, version, author, license, and more.
- **Dual Publishing Support**: Publish packages to npmjs.org, GitHub Packages, or both with a single command.
- **Automatic Version Bumping**: Supports patch, minor, and major version increments with automated updates to `package.json`.
- **GitHub Actions Integration**: Automatically generates a GitHub Actions workflow for continuous deployment.
- **Git Integration**: Initializes a git repository and provides scripts to commit and push changes.
- **Customizable Configuration**: Generates essential files like `package.json`, `.npmrc`, `README.md`, `LICENSE`, `.gitignore`, and a main `index.js`.
- **Upgrade Existing Packages**: Updates existing packages to use the latest features of `build-a-npm`.
- **Cross-Platform Support**: Works on Windows, macOS, and Linux with platform-specific guidance.

## Installation

Install the package globally or use it via `npx`:

```bash
npm install -g build-a-npm
```

Or run directly with `npx`:

```bash
npx build-a-npm init
```

## Usage

### Commands

The CLI provides two main commands: `init` and `upgrade`.

#### 1. `init [--no-git] [--sample]`

Initializes a new Node package by prompting for details or using sample data.

- `--no-git`: Skips git repository initialization.
- `--sample`: Uses predefined sample data instead of prompting for input.

Example:

```bash
npx build-a-npm init
```

This command will:

- Prompt for package details (name, version, author, etc.).
- Create a new directory (optional).
- Generate files: `package.json`, `README.md`, `LICENSE`, `index.js`, `.gitignore`, and `.npmrc` (if applicable).
- Set up a GitHub Actions workflow for publishing (if GitHub Packages is selected).
- Initialize a git repository (unless `--no-git` is used).

With sample data:

```bash
npx build-a-npm init --sample
```

#### 2. `upgrade`

Upgrades an existing package to use the latest `build-a-npm` features.

Example:

```bash
npx build-a-npm upgrade
```

This command will:

- Check for an existing `package.json` and `build-a-npm` in `devDependencies`.
- Update `package.json` scripts and dependencies.
- Add missing files like `.npmrc`, `.gitignore`, or GitHub Actions workflow.
- Preserve existing package details.

### Scripts

The generated `package.json` includes several scripts for publishing and managing the package:

- **`npm run publish`**: Publishes the package with a patch version bump and pushes changes to git (if configured for GitHub).
- **`npm run publish:patch`**: Publishes with a patch version bump (`x.y.z` → `x.y.z+1`).
- **`npm run publish:minor`**: Publishes with a minor version bump (`x.y.z` → `x.y+1.0`).
- **`npm run publish:major`**: Publishes with a major version bump (`x.y.z` → `x+1.0.0`).
- **`npm run github`**: Commits all changes and pushes to the GitHub repository (if configured for GitHub).

Example:

```bash
npm run publish:patch
```

This will:

- Bump the patch version in `package.json`.
- Publish to npmjs.org and/or GitHub Packages (based on configuration).
- Restore `package.json` to its original state but keep the bumped version.
- Commit and push changes to git (if configured).

### Generated Files

When initializing a new package, the following files are created:

- **`package.json`**: Defines the package metadata, scripts, and dependencies.
- **`index.js`**: The main entry point for the package with a sample implementation.
- **`README.md`**: A basic README with installation and usage instructions.
- **`LICENSE`**: A license file based on the selected license (MIT, ISC, Apache-2.0, GPL-3.0, or Unlicense).
- **`.gitignore`**: Ignores common Node.js files and directories.
- **`.npmrc`** (optional): Configures GitHub Packages authentication if a GitHub token is provided.
- **`.github/workflows/publish.yml`** (optional): A GitHub Actions workflow for automated publishing.

### Publishing Workflow

The publishing process is handled by `publish.js`, which:

1. Reads the current `package.json`.
2. Bumps the version based on the specified type (`--patch`, `--minor`, or `--major`).
3. Publishes to the specified registries (npmjs.org and/or GitHub Packages).
4. Restores `package.json` to its original state, keeping the bumped version.
5. Commits and pushes changes to git (if configured).

The GitHub Actions workflow (`publish.yml`) automates this process on pushes to the `main` branch, detecting the version bump type from the commit message (`major`, `minor`, or `patch`).

## Configuration

### GitHub Packages Setup

To publish to GitHub Packages:

1. Provide a GitHub Personal Access Token with the `write:packages` scope during `init`.
2. Configure `NPM_TOKEN` and `GITHUB_TOKEN` in your GitHub repository's secrets (`Settings > Secrets and variables > Actions`).
3. Ensure the repository exists at `https://github.com/<username>/<repo-name>`.

### npmjs.org Setup

To publish to npmjs.org:

1. Ensure you have an npm account and are logged in (`npm login`).
2. Configure `NPM_TOKEN` in your GitHub repository's secrets for automated publishing.

## Example Workflow

1. Initialize a new package:

```bash
npx build-a-npm init
```

2. Follow the prompts to configure the package.
3. Install dependencies:

```bash
npm install
```

4. Add your code to `index.js`.
5. Publish the package:

```bash
npm run publish
```

6. For subsequent updates, use:

```bash
npm run publish:minor
```

## Troubleshooting

- **Permission Errors**: On Windows, run commands in an Administrator Command Prompt. On other platforms, ensure write permissions for the project directory.
- **GitHub Token Issues**: Verify the token has the `write:packages` scope and is correctly set in `.npmrc` or GitHub Actions secrets.
- **Publish Failures**: Check network connectivity and registry authentication. Ensure `NPM_TOKEN` and `GITHUB_TOKEN` are set for GitHub Actions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/hsinghhira/build-a-npm).

## License

MIT
