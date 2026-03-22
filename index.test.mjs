import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToSlack, splitForSlack } from './index.mjs';

describe('markdownToSlack', () => {
  // --- Edge cases ---

  it('returns falsy input as-is', () => {
    assert.equal(markdownToSlack(''), '');
    assert.equal(markdownToSlack(null), null);
    assert.equal(markdownToSlack(undefined), undefined);
  });

  // --- Bold ---

  it('converts **bold** to *bold*', () => {
    assert.equal(markdownToSlack('**bold**'), '*bold*');
  });

  it('converts __bold__ to *bold*', () => {
    assert.equal(markdownToSlack('__bold__'), '*bold*');
  });

  // --- Italic ---

  it('converts *italic* to _italic_', () => {
    assert.equal(markdownToSlack('*italic*'), '_italic_');
  });

  // --- Bold + Italic coexistence ---

  it('handles bold and italic in the same line', () => {
    assert.equal(markdownToSlack('**bold** and *italic*'), '*bold* and _italic_');
  });

  // --- Strikethrough ---

  it('converts ~~strike~~ to ~strike~', () => {
    assert.equal(markdownToSlack('~~strike~~'), '~strike~');
  });

  // --- Links ---

  it('converts [text](url) to <url|text>', () => {
    assert.equal(markdownToSlack('[click](https://example.com)'), '<https://example.com|click>');
  });

  // --- Images ---

  it('converts ![alt](url) to <url|alt>', () => {
    assert.equal(markdownToSlack('![logo](https://img.png)'), '<https://img.png|logo>');
  });

  it('converts image with empty alt text', () => {
    assert.equal(markdownToSlack('![](https://img.png)'), '<https://img.png|>');
  });

  // --- Headings ---

  it('converts headings to bold text', () => {
    assert.equal(markdownToSlack('# Title'), '*Title*');
    assert.equal(markdownToSlack('## Subtitle'), '*Subtitle*');
    assert.equal(markdownToSlack('###### Deep'), '*Deep*');
  });

  it('strips bold/italic from heading content', () => {
    assert.equal(markdownToSlack('# **Bold Title**'), '*Bold Title*');
    assert.equal(markdownToSlack('# *Italic Title*'), '*Italic Title*');
    assert.equal(markdownToSlack('# __Also Bold__'), '*Also Bold*');
  });

  // --- Unordered lists ---

  it('converts - item to bullet', () => {
    assert.equal(markdownToSlack('- item one'), '\u2022  item one');
  });

  it('converts * item to bullet', () => {
    assert.equal(markdownToSlack('* item two'), '\u2022  item two');
  });

  it('preserves indentation in nested lists', () => {
    assert.equal(markdownToSlack('  - nested'), '  \u2022  nested');
  });

  // --- Horizontal rules ---

  it('converts --- to em dashes', () => {
    assert.equal(markdownToSlack('---'), '\u2014\u2014\u2014');
  });

  // NOTE: *** is ambiguous — bold/italic markers take precedence over HR rule.
  // Only --- and ___ reliably produce horizontal rules.

  it('converts ___ to em dashes', () => {
    assert.equal(markdownToSlack('___'), '\u2014\u2014\u2014');
  });

  // --- Inline code ---

  it('preserves inline code unchanged', () => {
    assert.equal(markdownToSlack('use `npm install`'), 'use `npm install`');
  });

  it('does not format inside inline code', () => {
    assert.equal(markdownToSlack('`**not bold**`'), '`**not bold**`');
  });

  // --- Code blocks ---

  it('preserves code blocks unchanged', () => {
    const input = '```\nconst x = 1;\n```';
    assert.equal(markdownToSlack(input), '```\nconst x = 1;\n```');
  });

  it('strips language specifier from code blocks', () => {
    const input = '```javascript\nconst x = 1;\n```';
    assert.equal(markdownToSlack(input), '```\nconst x = 1;\n```');
  });

  it('does not format inside code blocks', () => {
    const input = '```\n**bold** and *italic*\n```';
    assert.equal(markdownToSlack(input), '```\n**bold** and *italic*\n```');
  });

  // --- Tables ---

  it('converts a simple table to a preformatted block', () => {
    const input = '| Name | Score |\n|------|-------|\n| Alice | 95 |\n| Bob | 87 |';
    const result = markdownToSlack(input);
    assert.ok(result.includes('```'));
    assert.ok(result.includes('Name'));
    assert.ok(result.includes('Alice'));
    assert.ok(result.includes('Bob'));
  });

  it('strips bold from table cells', () => {
    const input = '| **Header** |\n|------|\n| value |';
    const result = markdownToSlack(input);
    assert.ok(result.includes('Header'));
    assert.ok(!result.includes('**'));
  });

  it('strips inline code backticks inside tables', () => {
    const input = '| `code` |\n|------|\n| text |';
    const result = markdownToSlack(input);
    assert.ok(result.includes('code'));
    assert.ok(result.includes('text'));
  });

  // --- Excessive newlines ---

  it('collapses 3+ consecutive newlines to 2', () => {
    assert.equal(markdownToSlack('a\n\n\n\nb'), 'a\n\nb');
  });

  // --- Slack code block spacing ---

  it('adds blank line after code block closing for Slack compatibility', () => {
    const input = '| A | B |\n|---|---|\n| 1 | 2 |\n\nsome text after';
    const result = markdownToSlack(input);
    assert.ok(result.includes('```\n\nsome text after'), 'should have blank line between ``` and text');
  });

  it('separates consecutive tables with blank lines', () => {
    const input = [
      '| A | B |', '|---|---|', '| 1 | 2 |',
      '',
      'middle text',
      '',
      '| C | D |', '|---|---|', '| 3 | 4 |',
    ].join('\n');
    const result = markdownToSlack(input);
    assert.ok(result.includes('```\n\nmiddle text'), 'blank line after first table');
    assert.ok(result.includes('text\n\n```'), 'blank line before second table');
  });

  it('does not add leading newline when code block is at start', () => {
    const input = '```\nhello\n```';
    const result = markdownToSlack(input);
    assert.ok(!result.startsWith('\n'), 'should not start with newline');
  });

  // --- Combined formatting ---

  it('handles a complex mixed document', () => {
    const input = [
      '# Report',
      '',
      '**Status**: *active*',
      '',
      '- item one',
      '- item two',
      '',
      '[docs](https://docs.com)',
      '',
      '---',
      '',
      '```js',
      'console.log("hi");',
      '```',
    ].join('\n');

    const result = markdownToSlack(input);

    assert.ok(result.includes('*Report*'));
    assert.ok(result.includes('*Status*'));
    assert.ok(result.includes('_active_'));
    assert.ok(result.includes('\u2022  item one'));
    assert.ok(result.includes('<https://docs.com|docs>'));
    assert.ok(result.includes('\u2014\u2014\u2014'));
    assert.ok(result.includes('```\nconsole.log("hi");\n```'));
  });
});

describe('splitForSlack', () => {
  it('returns short text as single-element array', () => {
    assert.deepEqual(splitForSlack('hello'), ['hello']);
  });

  it('returns falsy input as single-element array', () => {
    assert.deepEqual(splitForSlack(''), ['']);
    assert.deepEqual(splitForSlack(null), [null]);
  });

  it('splits long text at paragraph boundaries', () => {
    const a = 'a'.repeat(100);
    const b = 'b'.repeat(100);
    const text = a + '\n\n' + b;
    const chunks = splitForSlack(text, { maxLength: 150 });
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0], a);
    assert.equal(chunks[1], b);
  });

  it('splits at single newline when no paragraph break available', () => {
    const a = 'a'.repeat(100);
    const b = 'b'.repeat(100);
    const text = a + '\n' + b;
    const chunks = splitForSlack(text, { maxLength: 150 });
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0], a);
    assert.equal(chunks[1], b);
  });

  it('never splits inside a code block', () => {
    const codeBlock = '```\n' + 'x'.repeat(200) + '\n```';
    const text = 'before\n\n' + codeBlock + '\n\nafter';
    const chunks = splitForSlack(text, { maxLength: 150 });
    // The code block must be entirely in one chunk
    const blockChunk = chunks.find((c) => c.includes('```'));
    assert.ok(blockChunk);
    const backtickCount = (blockChunk.match(/```/g) || []).length;
    assert.equal(backtickCount, 2, 'code block opening and closing must be in same chunk');
  });

  it('keeps oversized code block intact in its own chunk', () => {
    const codeBlock = '```\n' + 'x'.repeat(5000) + '\n```';
    const text = 'before\n\n' + codeBlock + '\n\nafter';
    const chunks = splitForSlack(text, { maxLength: 3500 });
    assert.ok(chunks.length >= 2);
    const blockChunk = chunks.find((c) => c.includes('```'));
    assert.ok(blockChunk.includes('```\n') && blockChunk.includes('\n```'));
  });

  it('trims leading/trailing newlines from each chunk', () => {
    const text = 'aaa\n\n\nbbb\n\n\nccc';
    const chunks = splitForSlack(text, { maxLength: 5 });
    for (const chunk of chunks) {
      assert.ok(!chunk.startsWith('\n'), `chunk should not start with newline: "${chunk}"`);
      assert.ok(!chunk.endsWith('\n'), `chunk should not end with newline: "${chunk}"`);
    }
  });

  it('works with full report output from markdownToSlack', () => {
    const md = [
      '# Report',
      '',
      '| A | B |', '|---|---|', '| 1 | 2 |',
      '',
      'Some text between tables.',
      '',
      '| C | D |', '|---|---|', '| 3 | 4 |',
      '',
      'More text.',
      '',
      '| E | F |', '|---|---|', '| 5 | 6 |',
    ].join('\n');
    const mrkdwn = markdownToSlack(md);
    const chunks = splitForSlack(mrkdwn, { maxLength: 80 });
    // Every chunk with ``` must have an even number of ``` (paired)
    for (const chunk of chunks) {
      const count = (chunk.match(/```/g) || []).length;
      assert.equal(count % 2, 0, `unpaired code block in chunk: "${chunk.slice(0, 50)}..."`);
    }
  });
});
