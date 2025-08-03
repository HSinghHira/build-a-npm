const kleur = require('kleur');

function generateNextSteps(answers, isUpgrade, isWindows) {
  const steps = [];
  let stepNumber = 1;

  // Step 1: Run npm install
  steps.push(
    kleur.cyan(
      `${stepNumber++}. Run ${kleur.green().bold('`npm install`')} to install/update dependencies`
    )
  );
  steps.push(
    kleur.yellow(
      isWindows
        ? '   - On Windows, run commands in an Administrator Command Prompt to avoid permissions errors'
        : '   - Ensure you have write permissions for the project directory'
    )
  );

  // Step 2: GitHub Packages (if applicable)
  if (['GitHub Packages', 'Both'].includes(answers.publishTo)) {
    steps.push(
      kleur.cyan(
        `${stepNumber++}. Verify your GITHUB_TOKEN in .npmrc has the 'write:packages' scope`
      )
    );
    steps.push(
      kleur.yellow(
        '   - Create a token at https://github.com/settings/tokens if needed'
      )
    );
    if (answers.createGitHubWorkflow === 'Yes') {
      steps.push(
        kleur.cyan(
          `${stepNumber++}. Configure GitHub Actions secrets (NPM_TOKEN and/or GITHUB_TOKEN)`
        )
      );
    }
  }

  // Step 2 (or higher): GitHub Pages (if applicable)
  if (answers.createGitHubPages === 'Yes') {
    steps.push(
      kleur.cyan(
        `${stepNumber++}. Edit WEBPAGE.md to customize your GitHub Pages content`
      )
    );
    steps.push(
      kleur.cyan(
        `${stepNumber++}. Run ${kleur.green().bold('`npm run index`')} to regenerate index.html after editing WEBPAGE.md`
      )
    );
    steps.push(
      kleur.cyan(
        `${stepNumber++}. Ensure index.html is committed to the main branch`
      )
    );
    steps.push(
      kleur.cyan(
        `${stepNumber++}. Enable GitHub Pages in your repository settings (Settings > Pages > Source: main branch, / (root))`
      )
    );
    steps.push(
      kleur.yellow(
        `   - Ensure your GITHUB_TOKEN has the 'pages:write' scope${
          answers.githubToken && answers.githubToken.toLowerCase() !== 'na'
            ? ' (provided during setup)'
            : ''
        }`
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
      kleur.cyan(
        `${stepNumber++}. Run ${kleur.green().bold('`git init`')} and commit your changes if not already done`
      )
    );
    steps.push(
      kleur.yellow(
        `   - Run ${kleur.green().bold('`git add . && git commit -m "Initial commit" && git push`')}`
      )
    );
  }

  // Final step: Publish
  steps.push(
    kleur.cyan(
      `${stepNumber++}. Run ${kleur.green().bold('`npm run publish`')} to publish your ${
        isUpgrade ? 'updated ' : ''
      }package`
    )
  );

  return steps;
}

module.exports = { generateNextSteps };
