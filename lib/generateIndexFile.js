function generateIndexFile(useTypeScript, useESM) {
  const extension = useTypeScript ? "ts" : "js";
  const exportSyntax = useESM
    ? "export"
    : useTypeScript
    ? "export"
    : "module.exports =";
  const functionSyntax = useTypeScript ? ": string" : "";

  return `${
    useESM && !useTypeScript ? "" : useTypeScript ? "export " : "function "
  }example()${functionSyntax} {
  return "Hello, World!";
}

${useESM || useTypeScript ? "" : "module.exports = { example };"}`;
}

module.exports = { generateIndexFile };
