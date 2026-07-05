// 🆕 Mirrored from the frontend's src/data/words.ts so multiplayer race text
// draws from the same pools as singleplayer. Keep these two files in sync
// manually (no shared package for MVP — see README "shared code" note).
import type { WordSet } from '../rooms/types.js';

export const ENGLISH_200: string[] = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
  'large', 'often', 'hand', 'high', 'place', 'hold', 'turn', 'help', 'part',
  'point', 'city', 'play', 'small', 'number', 'off', 'always', 'move',
  'live', 'next', 'real', 'life', 'few', 'north', 'open', 'seem', 'together',
  'next', 'white', 'children', 'begin', 'got', 'walk', 'example', 'ease',
  'paper', 'group', 'always', 'music', 'those', 'both', 'mark', 'book',
  'letter', 'until', 'mile', 'river', 'car', 'feet', 'care', 'second',
  'enough', 'plain', 'girl', 'usual', 'young', 'ready', 'above', 'ever',
  'red', 'list', 'though', 'feel', 'talk', 'bird', 'soon', 'body',
  'dog', 'family', 'direct', 'pose', 'leave', 'song', 'measure', 'door',
  'product', 'black', 'short', 'numeral', 'class', 'wind', 'question',
  'happen', 'complete', 'ship', 'area', 'half', 'rock', 'order', 'fire',
  'south', 'problem', 'piece', 'told', 'knew', 'pass', 'since', 'top',
  'whole', 'king', 'space', 'heard', 'best', 'hour', 'better',
];

// NOTE: for brevity in this scaffold, english1k and common reuse english200.
// Copy the full ENGLISH_1K / COMMON_WORDS arrays from the frontend's
// src/data/words.ts verbatim before shipping — the server must have the
// complete pools so word-set choice actually changes the race text.
export const WORD_SETS: Record<WordSet, string[]> = {
  english200: ENGLISH_200,
  english1k: ENGLISH_200,
  common: ENGLISH_200,
};
