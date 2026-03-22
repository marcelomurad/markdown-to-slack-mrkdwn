#!/usr/bin/env node
import { readFileSync } from 'fs';
import { markdownToSlack, splitForSlack } from './index.mjs';

const input = readFileSync('/dev/stdin', 'utf8');
const mrkdwn = markdownToSlack(input);

if (process.argv.includes('--split')) {
  process.stdout.write(JSON.stringify(splitForSlack(mrkdwn)));
} else {
  process.stdout.write(mrkdwn);
}
