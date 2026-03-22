#!/usr/bin/env node
import { readFileSync } from 'fs';
import { markdownToSlack } from './index.mjs';

const input = readFileSync('/dev/stdin', 'utf8');
process.stdout.write(markdownToSlack(input));
