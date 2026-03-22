/**
 * markdown-to-slack-mrkdwn
 *
 * Converts standard Markdown to Slack mrkdwn format.
 * Handles tables, bold/italic conflicts, code blocks, links, lists, and headings.
 *
 * @param {string} text - Markdown text to convert
 * @returns {string} Slack mrkdwn formatted text
 */
export function markdownToSlack(text) {
  if (!text) return text;

  // --- Step 1: Protect literal content ---
  const codeBlocks = [];
  const inlineCodes = [];
  const resolvedInlines = new Set();

  // Protect code blocks (``` ... ```)
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `\u00a7CODE_BLOCK_${idx}\u00a7`;
  });

  // Protect inline code (` ... `)
  text = text.replace(/`[^`\n]+`/g, (match) => {
    const idx = inlineCodes.length;
    inlineCodes.push(match);
    return `\u00a7INLINE_CODE_${idx}\u00a7`;
  });

  // --- Step 2: Convert Markdown tables to preformatted code blocks ---
  text = text.replace(/(^\|.+\|\s*$\n?)+/gm, (tableBlock) => {
    const lines = tableBlock.trim().split('\n');
    // Filter separator rows (|---|---|)
    const dataLines = lines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l));
    if (dataLines.length === 0) return tableBlock;

    // Parse each line into columns
    const rows = dataLines.map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );

    // Resolve inline codes in cells (remove backticks — will be inside code block)
    for (const row of rows) {
      for (let j = 0; j < row.length; j++) {
        row[j] = row[j].replace(
          /\u00a7INLINE_CODE_(\d+)\u00a7/g,
          (_ph, idxStr) => {
            const idx = parseInt(idxStr);
            resolvedInlines.add(idx);
            return inlineCodes[idx].replace(/^`|`$/g, '');
          },
        );
        // Remove bold from cells (doesn't render in code blocks)
        row[j] = row[j].replace(/\*\*(.+?)\*\*/g, '$1');
        row[j] = row[j].replace(/__(.+?)__/g, '$1');
      }
    }

    // Calculate max width per column
    const colCount = Math.max(...rows.map((r) => r.length));
    const widths = [];
    for (let i = 0; i < colCount; i++) {
      widths[i] = Math.max(...rows.map((r) => (r[i] || '').length), 1);
    }

    // Format with fixed spacing (3-space gap between columns)
    const formatted = rows
      .map((row) =>
        row
          .map((cell, i) => (cell || '').padEnd(widths[i]))
          .join('   ')
          .trimEnd(),
      )
      .join('\n');

    // Protect generated code block
    const block = '```\n' + formatted + '\n```';
    const blockIdx = codeBlocks.length;
    codeBlocks.push(block);
    return `\u00a7CODE_BLOCK_${blockIdx}\u00a7` + '\n';
  });

  // --- Step 3: Convert formatting ---

  const BOLD_S = '\u00a7BOLD_S\u00a7';
  const BOLD_E = '\u00a7BOLD_E\u00a7';

  // Headings: # Text -> *Text* (strip internal bold/italic to avoid conflicts)
  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_match, content) => {
    content = content.replace(/\*\*(.+?)\*\*/g, '$1');
    content = content.replace(/__(.+?)__/g, '$1');
    content = content.replace(/\*(.+?)\*/g, '$1');
    return `${BOLD_S}${content}${BOLD_E}`;
  });

  // Bold: **text** and __text__ -> placeholder
  text = text.replace(/\*\*(.+?)\*\*/g, `${BOLD_S}$1${BOLD_E}`);
  text = text.replace(/__(.+?)__/g, `${BOLD_S}$1${BOLD_E}`);

  // Italic: *text* -> _text_ (safe because ** is now placeholder)
  text = text.replace(/\*(.+?)\*/g, '_$1_');

  // Restore bold: placeholder -> *text* (Slack bold)
  text = text.replace(/\u00a7BOLD_S\u00a7(.+?)\u00a7BOLD_E\u00a7/g, '*$1*');

  // Strikethrough: ~~text~~ -> ~text~
  text = text.replace(/~~(.+?)~~/g, '~$1~');

  // Images: ![alt](url) -> <url|alt>
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<$2|$1>');

  // Links: [text](url) -> <url|text>
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // Unordered lists: - item or * item -> bullet item
  text = text.replace(/^(\s*)[-*]\s+/gm, '$1\u2022  ');

  // Horizontal rules: --- or *** or ___ -> em dashes
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '\u2014\u2014\u2014');

  // --- Step 4: Restore literal content ---

  // Restore code blocks (remove language specifier)
  for (let i = 0; i < codeBlocks.length; i++) {
    let block = codeBlocks[i];
    block = block.replace(/^```[a-zA-Z0-9_+-]*\s*\n/, '```\n');
    const parts = block.match(/^(```\n?)([\s\S]*?)(\n?```)$/);
    if (parts) {
      let content = parts[2];
      content = content.replace(/`([^`\n]+)`/g, '$1');
      block = parts[1] + content + parts[3];
    }
    text = text.replace(`\u00a7CODE_BLOCK_${i}\u00a7`, block);
  }

  // Restore inline code (only unresolved ones)
  for (let i = 0; i < inlineCodes.length; i++) {
    if (!resolvedInlines.has(i)) {
      text = text.replace(`\u00a7INLINE_CODE_${i}\u00a7`, inlineCodes[i]);
    }
  }

  // Clean excessive newlines (max 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}
