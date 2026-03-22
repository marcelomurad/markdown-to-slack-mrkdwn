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

export interface SplitOptions {
  /** Maximum characters per chunk (default: 3500) */
  maxLength?: number;
}

/**
 * Splits Slack mrkdwn text into chunks that fit within Slack's message limit.
 * Never splits inside a code block (``` ... ```).
 *
 * @param text - Slack mrkdwn text to split
 * @param options - Split options
 * @returns Array of chunks ready to send as separate messages
 */
export declare function splitForSlack(
  text: string,
  options?: SplitOptions,
): string[];
