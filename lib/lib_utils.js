const fs = require("fs");
const path = require("path");

// Dynamic import for inquirer (ES module)
async function getInquirer() {
  const inquirer = await import("inquirer");
  return inquirer.default;
}

// Check if terminal supports colors
const supportsColor = process.stdout.isTTY && process.env.TERM !== "dumb";

function colorize(text, code) {
  return supportsColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

module.exports = {
  getInquirer,
  colorize,
  fs,
  path,
};