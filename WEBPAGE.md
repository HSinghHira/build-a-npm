**`build-a-npm`** is a robust and user-friendly CLI tool designed to simplify the creation, management, and publishing of Node.js packages. With an interactive setup, automatic version bumping, and seamless integration with npmjs.com and GitHub Packages, it’s the perfect companion for developers looking to streamline their package development workflow. 🌟

---

## 🌟 Overview

`build-a-npm` is an open-source CLI tool that empowers developers to scaffold, manage, and publish Node.js packages effortlessly. It offers an interactive setup process, generates a modern project structure, and supports advanced features like automated version bumping, GitHub Actions for CI/CD, and TypeScript integration. Whether you’re a beginner creating your first package or an experienced developer maintaining a monorepo, `build-a-npm` ensures a smooth and efficient workflow across Windows, macOS, and Linux. 🚀

---

## ✨ Features

- **🧠 Interactive Setup**: Guided prompts for package details, including name, version, author, license, and more.
- **🔢 Automatic Version Bumping**: Supports `patch`, `minor`, and `major` version increments with automated `package.json` updates.
- **🌐 Dual Publishing**: Publish to npmjs.com, GitHub Packages, or both with a single command.
- **🤖 GitHub Actions Integration**: Generates workflows for automated publishing and documentation deployment.
- **📂 Git Integration**: Initializes a git repository and includes scripts for committing and pushing changes.
- **📘 TypeScript Support**: Optional TypeScript setup for modern JavaScript development.
- **📁 Comprehensive File Generation**: Creates essential files like `package.json`, `index.js`, `README.md`, `.gitignore`, `.npmignore`, and more.
- **🔄 Package Upgrades**: Updates existing packages to leverage the latest `build-a-npm` features without affecting custom code.
- **🌍 Cross-Platform**: Works seamlessly on Windows, macOS, and Linux.
- **📜 GitHub Pages Support**: Generates documentation and publishes it to GitHub Pages.
- **🔧 CI/CD Support**: Templates for GitHub Actions, CircleCI, and GitLab CI.

---

## 📦 Installation

### Option 1: Install Globally

```bash
npm install -g build-a-npm
```

Run `build-a-npm` commands directly from your terminal. 🌐

### Option 2: Use via npx

```bash
npx build-a-npm <command>
```

Execute the latest version without global installation. 🚀

---

## 🚀 Usage

`build-a-npm` offers two primary commands: `init` and `upgrade`, along with a robust publishing workflow and documentation support.

### 🛠️ Creating a New Package

The `init` command scaffolds a new Node.js package with a guided setup process.

```bash
npx build-a-npm init
```

#### What It Does:

- 📝 Prompts for package details, including:
  - **Directory**: Create a new directory (same as package name, custom, or none).
  - **Monorepo Support**: Configure for monorepo setups with `npm`, `pnpm`, or `yarn`.
  - **Publishing**: Choose npmjs.com, GitHub Packages, or both.
  - **Access Level**: Public or private package.
  - **GitHub Workflow**: Optional GitHub Actions setup for CI/CD.
  - **GitHub Repository**: Auto-create a GitHub repository.
  - **GitHub Pages**: Enable documentation publishing.
  - **CI/CD Provider**: GitHub Actions, GitLab CI, CircleCI, or none.
  - **Package Details**: Name, version, description, author, license, keywords, etc.
  - **TypeScript/ESLint/Prettier**: Optional configurations for modern development.
  - **Dependencies**: Add dependencies and devDependencies with version control.
  - **Custom Scripts**: Add custom `package.json` scripts.
- 📂 Creates a project directory (if specified).
- 📁 Generates essential files (see [Generated Files](#generated-files)).
- 🔗 Initializes a git repository (unless `--no-git` is used).
- 🤖 Sets up CI/CD workflows (if enabled).

#### Optional Flags:

- `--no-git`: Skip git repository initialization.
- `--sample`: Use predefined sample data to skip prompts.
- `--verbose`: Display detailed logs.

#### Example:

```bash
npx build-a-npm init --sample --no-git
```

### 🔄 Upgrading an Existing Package

The `upgrade` command enhances existing packages with the latest `build-a-npm` features.

```bash
npx build-a-npm upgrade
```

#### What It Does:

- ✅ Verifies `package.json` and `build-a-npm` in `devDependencies`.
- 🔄 Updates `package.json` scripts and dependencies.
- 📁 Adds missing files (e.g., `.npmrc`, `.gitignore`, `.npmignore`, CI/CD workflows).
- 🛡️ Preserves existing code and configurations.

### 📤 Publishing a Package

The `publish.js` script manages version bumping and publishing to registries. The generated `package.json` includes scripts for various publishing scenarios:

| Script                  | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `npm run publish`       | Alias for `publish:patch`.                             |
| `npm run publish:patch` | Patch version bump (`0.0.1` → `0.0.2`) and Publish     |
| `npm run publish:minor` | Minor version bump (`0.1.0` → `0.2.0`) and Publish     |
| `npm run publish:major` | Major version bump (`1.0.0` → `2.0.0`) and Publish     |
| `npm run pub`           | Alias for `publish:patch`.                             |
| `npm run pub:pat`       | Alias for `publish:patch`.                             |
| `npm run pub:min`       | Alias for `publish:minor`.                             |
| `npm run pub:maj`       | Alias for `publish:major`.                             |
| `npm run nogit:patch`   | Patch bump and publish without git operations.         |
| `npm run nogit:minor`   | Minor bump and publish without git operations.         |
| `npm run nogit:major`   | Major bump and publish without git operations.         |
| `npm run do`            | Runs `git`, then `publish:patch`.                      |
| `npm run git`           | Generates `index.html`, commits, and pushes to GitHub. |
| `npm run index`         | Generates `index.html` for GitHub Pages.               |
| `npm run format`        | Formats code with Prettier.                            |

#### Example:

```bash
npm run publish:minor
```

This will:

- 🔢 Bump the minor version in `package.json`.
- 📤 Publish to npmjs.com and/or GitHub Packages.
- 🔄 Restore `package.json` (keeping the bumped version).
- 📜 Commit and push changes to git (if enabled).
- 📊 Log publishing details via `publishConsole.js`.

### 📜 Publishing the Documentation

If GitHub Pages is enabled during `init`, `build-a-npm` generates a `WEBPAGE.md` file to create an `index.html` file for documentation.

#### Steps:

1. **Enable GitHub Pages**:
   - During `init`, select `Yes` for "Publish a Documentation on GitHub Pages?".
   - Provide a GitHub fine-grained Personal Access Token with `pages:write` scope.
2. **Generate Documentation**:

   ```bash
   npm run index
   ```

   This runs `generateIndex.js` to create `index.html` from your `README.md`.

3. **Publish to GitHub Pages**:
   - The `.github/workflows/publish.yml` workflow (if enabled) automatically deploys `index.html` to GitHub Pages on pushes to the `main` branch.
   - Alternatively, manually commit and push `index.html` to the `gh-pages` branch.

#### Requirements:

- A GitHub repository with Pages enabled.
- A fine-grained token with `pages:write` scope, added to `.npmrc` or GitHub Secrets (`GITHUB_PAGES_TOKEN`).

---

## 📁 Generated Files

`build-a-npm` creates a comprehensive set of files to ensure a modern and functional package:

- **📝 `package.json`**: Defines metadata, scripts, dependencies, and publishing configuration.
- **🛠️ `index.js`**: Main entry point with a sample implementation.
- **📜 `README.md`**: Starter documentation with usage instructions.
- **📄 `LICENSE`**: License file (MIT, ISC, Apache-2.0, GPL-3.0, or Unlicense).
- **🙈 `.gitignore`**: Ignores common Node.js files (e.g., `node_modules`).
- **🙈 `.npmignore`**: Specifies files to exclude from npm publishing.
- **🔐 `.npmrc`**: Configures GitHub Packages authentication (if enabled).
- **🤖 `.github/workflows/publish.yml`**: GitHub Actions workflow for CI/CD (if enabled).
- **📄 `generateIndex.js`**: Script to generate `index.html` for GitHub Pages (if enabled).
- **🔧 `.prettierrc`**: Prettier configuration for code formatting (if enabled).
- **🔍 `.eslintrc.json`**: ESLint configuration for linting (if enabled).
- **🧪 `test.js`**: Sample test file (if a testing framework is selected).
- **⚙️ `tsconfig.json`**: TypeScript configuration (if TypeScript is enabled).

---

## ⚙️ Configuration

### 🌐 npmjs.com Setup

1. Create an npm account and log in:
   ```bash
   npm login
   ```
2. Add `NPM_TOKEN` to GitHub Secrets for automated publishing:
   - Go to `Settings > Secrets and variables > Actions > New repository secret`.
   - Add `NPM_TOKEN` with your npm token.
3. Run a publish command (e.g., `npm run publish`).

### 🔗 GitHub Packages Setup

1. Create a GitHub Classic Personal Access Token with `repo` and `write:packages` scopes.
2. During `init`, provide the token or add it to `.npmrc`:
   ```
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```
3. Add `GITHUB_TOKEN` to GitHub Secrets.
4. Ensure the repository exists at `https://github.com/<username>/<repo-name>`.

### 🤖 GitHub Actions for Auto-Publishing

1. Add `NPM_TOKEN` and `GITHUB_TOKEN` to GitHub Secrets.
2. The `.github/workflows/publish.yml` workflow runs on pushes to `main`, detecting version bump types (`major`, `minor`, `patch`) from commit messages.

---

## 📜 Scripts in package.json

The `package.json` includes a rich set of scripts for development and publishing:

```json
{
  "scripts": {
    "publish": "node node_modules/build-a-npm/publish.js --patch --npmjs --github && npm run git && npm run console",
    "publish:patch": "node node_modules/build-a-npm/publish.js --patch --npmjs --github && npm run git && npm run console",
    "publish:minor": "node node_modules/build-a-npm/publish.js --minor --npmjs --github && npm run git && npm run console",
    "publish:major": "node node_modules/build-a-npm/publish.js --major --npmjs --github && npm run git && npm run console",
    "pub": "npm run publish:patch",
    "pub:pat": "npm run publish:patch",
    "pub:min": "npm run publish:minor",
    "pub:maj": "npm run publish:major",
    "nogit:patch": "node node_modules/build-a-npm/publish.js --patch --npmjs --github && npm run console",
    "nogit:minor": "node node_modules/build-a-npm/publish.js --minor --npmjs --github && npm run console",
    "nogit:major": "node node_modules/build-a-npm/publish.js --major --npmjs --github && npm run console",
    "do": "npm run git && node publish.js --patch --github --npmjs && npm run console",
    "git": "npm run index && git add . && git commit -m \"chore: updates\" && git branch -M main && (git remote get-url origin || git remote add origin https://github.com/hsinghhira/build-a-npm.git) && git push",
    "index": "node generateIndex.js",
    "console": "node node_modules/build-a-npm/lib/publishConsole.js",
    "format": "prettier --write .",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## 🔧 Example Workflow

1. **Initialize a Package**:

   ```bash
   npx build-a-npm init
   ```

   Answer prompts to configure your package.

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Develop Your Package**:
   Edit `index.js` to add your functionality.
4. **Format Code**:

   ```bash
   npm run format
   ```

5. **Publish the Package**:

   ```bash
   npm run publish
   ```

6. **Update and Republish**:

   ```bash
   npm run publish:minor
   ```

7. **Publish Documentation** (if enabled):

   ```bash
   npm run index
   ```

---

## 🛠️ Troubleshooting

| Problem                   | Solution                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| **Permission Error**      | Run as Administrator (Windows) or use `sudo` (macOS/Linux).             |
| **GitHub Token Issue**    | Ensure tokens have `repo`, `write:packages`, or `pages:write` scopes.   |
| **Publish Failure**       | Verify network, `NPM_TOKEN`, and `GITHUB_TOKEN` in `.npmrc` or Secrets. |
| **Package Name Conflict** | Check npm registry for existing names; use a unique or scoped name.     |
| **Git Issues**            | Use `--no-git` or resolve git conflicts manually.                       |

---

## 🤝 Contributing

We welcome contributions! To get involved:

1. Visit the [GitHub Repository](https://github.com/hsinghhira/build-a-npm).
2. Open an issue for bugs or feature requests.
3. Submit a pull request with your changes, following the repository’s guidelines.

---

## 📩 Contact me

Feel free to contact me related to anything:

## 👉 [Contact me](https://me.hsinghhira.me/contact/)

---
