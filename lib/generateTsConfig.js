const { logger } = require("./utils");

function generateTsConfig(answers) {
  logger.debug("Generating tsconfig.json");
  const content = JSON.stringify(
    {
      compilerOptions: {
        target: "es2016",
        module: answers.moduleType === "ES Modules" ? "esnext" : "commonjs",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    },
    null,
    2
  );
  return content;
}

module.exports = { generateTsConfig };
