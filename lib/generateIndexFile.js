function generateIndexFile(useTypeScript) {
  if (useTypeScript) {
    return `// Your package main file
console.log('Hello from your new TypeScript package!');

export function hello(): void {
  console.log('Hello World!');
}
`;
  }
  return `// Your package main file
console.log('Hello from your new npm package!');

module.exports = {
  // Add your package exports here
  hello: () => console.log('Hello World!')
};
`;
}

module.exports = { generateIndexFile };
