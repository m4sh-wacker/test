import type { Operation } from './types';

/**
 * The jokes.
 *
 * People look for them, and they cost almost nothing to keep. A tool that is
 * pleasant to use gets opened more often than one that is not, and for
 * something meant to become a habit that matters.
 */

export const jokeOperations: Operation[] = [
  {
    id: 'numberwang',
    name: 'Numberwang',
    category: 'Other',
    description: 'Determines whether the input is Numberwang, the popular British quiz.',
    aliases: ['is it numberwang', 'wangernumb'],
    args: [],
    run: (input) => {
      if (input.length === 0) return "Let's play Wangernumb!";
      return Math.random() < 0.5
        ? `${input} is Numberwang!`
        : `Sorry, ${input} is not Numberwang. Let's rotate the board!`;
    },
  },
  {
    id: 'xkcd-random-number',
    name: 'XKCD Random Number',
    category: 'Other',
    description: 'Returns a random number, chosen by fair dice roll. Guaranteed to be random.',
    aliases: ['random number', 'xkcd 221', 'dice roll'],
    args: [],
    // https://xkcd.com/221/
    run: () => '4',
  },
];
