export const setFrontmatterOrder = (content, order) => {
  const match = content.match(/^---(\r?\n)([\s\S]*?)(\r?\n)---(\r?\n|$)/);
  if (!match) throw new Error('Artwork record has no valid frontmatter.');

  const newline = match[1];
  const frontmatter = /^order\s*:/m.test(match[2])
    ? match[2].replace(/^order\s*:.*$/m, `order: ${order}`)
    : `${match[2]}${newline}order: ${order}`;

  return `---${newline}${frontmatter}${newline}---${match[4]}${content.slice(match[0].length)}`;
};
