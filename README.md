# 🛠️ build-a-npm

**A simple CLI tool to create and publish Node.js packages easily.**

---

## 📦 What is this?

`build-a-npm` helps you create a new NPM package with all important files (like `package.json`, `README.md`, `.gitignore`, `LICENSE`, etc.) in seconds.

It also lets you **publish your package** to:

- [npmjs.com](https://npmjs.com)
- GitHub Packages

With **automatic version bumping** (patch, minor, or major)!

---

## ✨ Features

- 📦 Easy and guided package setup
- 🛠️ Auto-create files:`index.js`,`.gitignore`,`README.md`, etc.
- 🔄 Auto bump version (patch, minor, major)
- 🚀 Publish to npm or GitHub with one command
- 🤖 GitHub Actions & GitLab CI support
- ♻️ Update existing packages with`upgrade` command
- 🌐 Works on Windows, macOS, and Linux

---

## 📥 Installation

### Option 1: Install globally

```bash
npm install -g build-a-npm
```

### Option 2: Use with npx (no install needed)

```
npx build-a-npm init
```

---

## 🚀 Usage

### 🧱 Create a New Package

```
npx build-a-npm init
```

This will:

- Ask for package details
- Create important files
- Set up GitHub workflows (optional)
- Init a Git repo (optional)

#### Optional flags:

- `--no-git`: skip Git initialization
- `--sample`: use default answers
- `--verbose`: show full logs

Example:

```
npx build-a-npm init --sample --no-git
```

### 🔁 Upgrade an Existing Package

```
npx build-a-npm upgrade
```

This will:

- Update old setup
- Add missing config files
- Keep your custom code safe

---

## ⚙️ Scripts in package.json

These scripts help with publishing:

| Script                  | What it does                      |
| ----------------------- | --------------------------------- |
| `npm run publish`       | Bumps patch version and publishes |
| `npm run publish:patch` | Patch bump (x.y.z → x.y.z+1)      |
| `npm run publish:minor` | Minor bump (x.y.z → x.y+1.0)      |
| `npm run publish:major` | Major bump (x.y.z → x+1.0.0)      |
| `npm run github`        | Git commit & push to GitHub       |

Example:

```
npm run publish:minor
```

---

## 🧾 Files It Generates

- `package.json` – With scripts and meta infomation
- `index.js` – Main code entry
- `README.md` – Starter guide
- `LICENSE` – MIT, ISC, GPL, etc.
- `.gitignore` – For node projects
- `.npmrc` – To publish to GitHub Packages _(only if GitHub publish is enabled)_
- `.github/workflows/publish.yml` – GitHub Actions CI/CD _(if enabled)_
- `.prettierrc`,`.eslintrc.json` – Config files _(if enabled)_
- `test.js`,`tsconfig.json` – Optional extras _(if enabled)_

---

## 🤝 Contributing

Feel free to open issues or submit PRs:

👉 [GitHub Repository](https://github.com/HSinghHira/build-a-npm)

---

## 📄 License

This project is licensed under the [MIT License]()

---

## 📤 Publishing

The script `publish.js` handles:

1. Reading`package.json`
2. Bumping version
3. Publishing to registries
4. Restoring original file
5. Committing and pushing to Git (if GitHub enabled)

If using GitHub Actions, your workflow (`publish.yml`) will auto-run when changes are pushed.

---

## 🔐 Setup GitHub Packages (optional)

To publish to GitHub:

1. Use a GitHub token (with`write:packages` scope)
2. Save it in`.npmrc` or GitHub Secrets:
   - `NPM_TOKEN`
   - `GITHUB_TOKEN`
3. Make sure your GitHub repo exists and is linked

---

## 📦 Setup npmjs.org

To publish to npm:

1. Run`npm login`
2. Save your`NPM_TOKEN` in GitHub Secrets (for CI/CD)
3. Run:

```
npm run publish
```

---

## 🔧 Example Workflow

```
# 1. Create a new package
npx build-a-npm init

# 2. Add your code in index.js

# 3. Install any needed dependencies
npm install

# 4. Publish your first version
npm run publish

# 5. Next time, bump version like this:
npm run publish:minor
```

---

## 🛠️ Troubleshooting

| Problem            | Solution                          |
| ------------------ | --------------------------------- |
| Permission Error   | Run terminal as Admin or use sudo |
| GitHub Token Issue | Check token scope and`.npmrc`     |
| Publish Fails      | Check internet and auth settings  |

---

## 🤝 Contributing

Feel free to open issues or submit PRs:

👉 [GitHub Repository](https://github.com/HSinghHira/build-a-npm)

---

## 📄 License

This project is licensed under the [MIT License]()
