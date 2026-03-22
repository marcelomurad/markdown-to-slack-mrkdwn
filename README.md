# markdown-to-slack-mrkdwn

Convert standard Markdown to [Slack mrkdwn](https://api.slack.com/reference/surfaces/formatting) format.

## Why?

Slack uses its own markup syntax (mrkdwn) that differs from standard Markdown. This converter handles the tricky edge cases that simpler converters miss:

- **Tables** — converted to aligned, preformatted code blocks
- **Bold/italic conflicts** — `**bold**` and `*italic*` coexist without breaking
- **Code blocks** — protected from formatting, language specifiers removed
- **Inline code** — preserved inside text, stripped inside tables
- **Links & images** — `[text](url)` becomes `<url|text>`
- **Lists** — `-` and `*` become bullet points
- **Headings** — `# Title` becomes `*Title*` (bold)
- **Strikethrough** — `~~text~~` becomes `~text~`
- **Horizontal rules** — `---` becomes `———`

Zero dependencies. Works with Node.js 18+.

## Install

```bash
npm install markdown-to-slack-mrkdwn
```

## Usage

### As a module (ESM)

```js
import { markdownToSlack } from 'markdown-to-slack-mrkdwn';

const slack = markdownToSlack('# Hello **world**');
// → '*Hello world*'
```

### As a CLI

```bash
echo "# Hello **world**" | npx markdown-to-slack-mrkdwn
# → *Hello world*
```

Or install globally:

```bash
npm install -g markdown-to-slack-mrkdwn
echo "**bold** and *italic*" | md-to-slack
# → *bold* and _italic_
```

Use `--split` to get a JSON array of chunks safe for Slack's message limit:

```bash
cat report.md | md-to-slack --split
# → ["chunk1...", "chunk2...", ...]
```

### TypeScript

Types are included out of the box:

```ts
import { markdownToSlack, splitForSlack } from 'markdown-to-slack-mrkdwn';
// markdownToSlack(text: string): string
// splitForSlack(text: string, options?: { maxLength?: number }): string[]
```

### Splitting long messages

Slack truncates messages over ~4000 characters, which can break code blocks mid-table. Use `splitForSlack` to split the output into safe chunks:

```js
import { markdownToSlack, splitForSlack } from 'markdown-to-slack-mrkdwn';

const mrkdwn = markdownToSlack(longMarkdown);
const messages = splitForSlack(mrkdwn); // default: 3500 chars per chunk

for (const msg of messages) {
  await slack.chat.postMessage({ channel, text: msg });
}
```

Custom limit:

```js
const messages = splitForSlack(mrkdwn, { maxLength: 2000 });
```

Code blocks are never split — each chunk has properly paired `` ``` `` markers.

## Examples

| Markdown | Slack mrkdwn |
|----------|-------------|
| `**bold**` | `*bold*` |
| `*italic*` | `_italic_` |
| `~~strike~~` | `~strike~` |
| `[link](url)` | `<url\|link>` |
| `# Heading` | `*Heading*` |
| `- item` | `\u2022  item` |
| `` `code` `` | `` `code` `` |
| `---` | `\u2014\u2014\u2014` |

Markdown tables are converted to aligned preformatted blocks:

```
| Name  | Score |        ```
|-------|-------|  →     Name    Score
| Alice | 95    |        Alice   95
| Bob   | 87    |        Bob     87
                         ```
```

## License

MIT
