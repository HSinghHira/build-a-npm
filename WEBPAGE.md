# 🎉 Welcome

Welcome to the comprehensive documentation for **build-a-npm** - a powerful tool for creating and managing npm packages with ease.

This documentation is automatically generated from `WEBPAGE.md`. To update this page, simply edit that file and run `npm run index`.

# 🚀 Getting Started

Get up and running with build-a-npm in just a few simple steps:

## Installation

```bash
npm install build-a-npm --save-dev
```

## Quick Setup

- Initialize your project with `npm init`
- Install build-a-npm as a development dependency
- Configure your build scripts in `package.json`
- Start building amazing npm packages! 🎨

> **Pro Tip:** After editing `WEBPAGE.md`, run `npm run index` to regenerate this beautiful documentation page automatically.

# ✨ Features

build-a-npm comes packed with powerful features to streamline your development workflow:

| Feature                | Description                                                       | Status         |
| ---------------------- | ----------------------------------------------------------------- | -------------- |
| **Auto Documentation** | Automatically generate beautiful documentation from Markdown      | ✅ Active      |
| **Theme Support**      | Built-in dark/light theme switching with localStorage persistence | ✅ Active      |
| **Responsive Design**  | Mobile-first responsive design that works on all devices          | ✅ Active      |
| **GitHub Pages Ready** | Optimized for seamless GitHub Pages deployment                    | ✅ Active      |
| **TypeScript Support** | Full TypeScript support with type definitions                     | 🚧 Coming Soon |

# 📚 API Reference

Comprehensive API documentation for build-a-npm:

## Core Methods

| Method    | Parameters            | Returns       | Description                                          |
| --------- | --------------------- | ------------- | ---------------------------------------------------- |
| `build()` | options: BuildOptions | Promise<void> | Builds your npm package with specified configuration |
| `watch()` | pattern: string       | Watcher       | Watches files for changes and rebuilds automatically |
| `clean()` | -                     | Promise<void> | Cleans build artifacts and temporary files           |
| `test()`  | suite: string         | TestResults   | Runs test suite with coverage reporting              |

## Example Usage

```javascript
import { build, watch } from 'build-a-npm';

// Build your package
await build({
  entry: 'src/index.ts',
  output: 'dist/',
  format: ['cjs', 'esm'],
  minify: true,
});

// Watch for changes
const watcher = watch('src/**/*.ts');
watcher.on('change', () => {
  console.log('Rebuilding...');
});
```

# 🔧 Next Steps

Ready to take your npm package to the next level? Here's what you can do:

1. **Customize** - Update this documentation with your project-specific details
2. **Build** - Run `npm run index` to regenerate the beautiful index.html
3. **Deploy** - Commit your changes to update your GitHub Pages site automatically
4. **Share** - Share your amazing documentation with the world! 🌍

> **Need Help?** Check out our [GitHub Repository](https://github.com/hsinghhira/build-a-npm) for examples, issues, and community support.
