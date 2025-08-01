function generateIndexFile() {
  return `// Your package main file
console.log('Hello from your new npm package!');

module.exports = {
  // Add your package exports here
  hello: () => console.log('Hello World!')
};
`;
}

module.exports = { generateIndexFile };