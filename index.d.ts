/**
 * Converts standard Markdown to Slack mrkdwn format.
 *
 * Handles: tables, bold/italic, code blocks, inline code, links, images,
 * headings, lists, strikethrough, and horizontal rules.
 *
 * @param text - Markdown text to convert
 * @returns Slack mrkdwn formatted text
 */
export declare function markdownToSlack(text: string): string;
