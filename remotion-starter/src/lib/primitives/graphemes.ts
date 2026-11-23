// Splits text into user-perceived characters (grapheme clusters), so an emoji, a flag or a letter with a combining
// accent stays one unit. Used by TypeOn and by TextRoll's char mode; internal, not exported from the library barrel.
const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});

export const splitGraphemes = (text: string): string[] => Array.from(segmenter.segment(text), (s) => s.segment);
