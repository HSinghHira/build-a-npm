const { colorize } = require('./utils');

function generateNextSteps(answers, isUpgrade, isWindows) {
  const steps = [];
  let stepNumber = 1;

  // Step 1: Run npm install
  steps.push(
    colorize(
      `${stepNumber++}. Run \`npm install\` to install/update dependencies`,
      '36'
    )
  );
  steps.push(
    colorize(
      isWindows
        ? '   - On Windows, run commands in an Administrator Command Prompt to avoid permissions errors'
        : '   - Ensure you have write permissions for the project directory',
      '33'
    )
  );

  // Step 2: GitHub Packages (if applicable)
  if (['GitHub Packages', 'Both'].includes(answers.publishTo)) {
    steps.push(
      colorize(
        `${stepNumber++}. Verify your GITHUB_TOKEN in .npmrc has the 'write:packages' scope`,
        '36'
      )
    );
    steps.push(
      colorize(
        '   - Create a token at https://github.com/settings/tokens if needed',
        '33'
      )
    );
    if (answers.createGitHubWorkflow === 'Yes') {
      steps.push(
        colorize(
          `${stepNumber++}. Configure GitHub Actions secrets (NPM_TOKEN and/or GITHUB_TOKEN)`,
          '36'
        )
      );
    }
  }

  // Step 2 (or higher): GitHub Pages (if applicable)
  if (answers.createGitHubPages === 'Yes') {
    steps.push(
      colorize(
        `${stepNumber++}. Edit WEBPAGE.md to customize your GitHub Pages content`,
        '36'
      )
    );
    steps.push(
      colorize(
        `${stepNumber++}. Run \`npm run index\` to regenerate index.html after editing WEBPAGE.md`,
        '36'
      )
    );
    steps.push(
      colorize(
        `${stepNumber++}. Ensure index.html is committed to the main branch`,
        '36'
      )
    );
    steps.push(
      colorize(
        `${stepNumber++}. Enable GitHub Pages in your repository settings (Settings > Pages > Source: main branch, / (root))`,
        '36'
      )
    );
    steps.push(
      colorize(
        `   - Ensure your GITHUB_TOKEN has the 'pages:write' scope${
          answers.githubToken.toLowerCase() !== 'na'
            ? ' (provided during setup)'
            : ''
        }`,
        '33'
      )
    );
  }

  // Step for git initialization (only for init)
  if (
    !isUpgrade &&
    !answers.noGit &&
    ['GitHub Packages', 'Both'].includes(answers.publishTo)
  ) {
    steps.push(
      colorize(
        `${stepNumber++}. Run \`git init\` and commit your changes if not already done`,
        '36'
      )
    );
    steps.push(
      colorize(
        `   - Run \`git add . && git commit -m "Initial commit" && git push\``,
        '33'
      )
    );
  }

  // Final step: Publish
  steps.push(
    colorize(
      `${stepNumber++}. Run \`npm run publish\` to publish your ${
        isUpgrade ? 'updated ' : ''
      }package`,
      '36'
    )
  );

  return steps;
}

module.exports = { generateNextSteps };
