const kleur = require('kleur');

// Ensure UTF-8 encoding for proper character display
process.stdout.setEncoding('utf8');

function createConsoleBox(messages) {
  const borderColor = kleur.cyan().bold;
  const labelColor = kleur.green().bold;
  const emojiColor = kleur.yellow().bold;
  const messageColor = kleur.white;
  const maxWidth = 90; // Maximum width of the box
  const sidePadding = 4; // Padding on each side

  // Helper function to calculate visible length (excluding ANSI codes)
  const getVisibleLength = str => {
    // Remove ANSI escape codes for length calculation
    const cleanStr = str.replace(/\x1B\[[0-9;]*m/g, '');
    // Count emojis (approximate as 1 character for simpler handling)
    const emojiCount = (cleanStr.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [])
      .length;
    return cleanStr.length - emojiCount; // Treat emojis as single-width
  };

  // Calculate the longest message for box width
  const maxContentLength = Math.max(
    ...messages.map(
      m => getVisibleLength(m.emoji + m.label + m.message) + sidePadding * 3 + 3
    )
  );
  const boxWidth = Math.min(Math.max(maxContentLength, 30), maxWidth);

  // Generate top border
  console.log(borderColor('╔' + '═'.repeat(boxWidth - 0) + '╗'));

  // Add empty line for spacing
  console.log(borderColor('║') + ' '.repeat(boxWidth - 0) + borderColor('║'));

  // Generate content lines
  messages.forEach(({ emoji, label, message }) => {
    // Use ASCII fallback if emoji is complex
    const displayEmoji = emoji.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)
      ? '*'
      : emoji;
    const content = `${emojiColor(displayEmoji)}  ${labelColor(label)}${messageColor(message)}`;
    const contentLength = getVisibleLength(displayEmoji + label + message) + 2; // Adjust for spacing
    const paddingLength = Math.max(
      0,
      boxWidth - contentLength - sidePadding * 1
    );
    const padding = ' '.repeat(paddingLength);
    console.log(
      borderColor('║') +
        ' '.repeat(sidePadding) +
        content +
        padding +
        borderColor('║')
    );
  });

  // Add empty line for spacing
  console.log(borderColor('║') + ' '.repeat(boxWidth - 0) + borderColor('║'));

  // Generate bottom border
  console.log(borderColor('╚' + '═'.repeat(boxWidth - 0) + '╝'));
}

// Usage with simpler ASCII fallbacks
createConsoleBox([
  { emoji: '»', label: 'Congratulations! ', message: '' },
  { emoji: '»', label: '', message: 'Package Successfully Published.' },
  { emoji: '»', label: '', message: "You're all set for the next move!" },
]);
