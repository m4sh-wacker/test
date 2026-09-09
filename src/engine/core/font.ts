import { setPixel, type Image } from './image';

/**
 * A 5×7 bitmap font, written out as pictures of itself.
 *
 * Charts need axis labels and the image operations need a way to write on a
 * picture, and neither can use a web font: measuring and rasterising text needs
 * a canvas, which this project deliberately does not use. So the letters are
 * here, drawn as dots and hashes so that a wrong pixel is visible in the diff
 * rather than hidden in a hexadecimal table.
 *
 * It is capitals, digits and punctuation. Lower case is drawn as capitals — a
 * five-pixel-wide cell has no room for descenders, and a label that is legible
 * matters more here than one that is typographically right.
 */

const GLYPHS: Record<string, string> = {
  ' ': '...../...../...../...../...../...../.....',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '#####/...#./..#../...#./....#/#...#/.###.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#..#./#...#/#...#/#...#/#..#./####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  '.': '...../...../...../...../...../.##../.##..',
  ',': '...../...../...../...../.##../.##../.#...',
  ':': '...../.##../.##../...../.##../.##../.....',
  ';': '...../.##../.##../...../.##../.##../.#...',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '-': '...../...../...../#####/...../...../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '=': '...../...../#####/...../#####/...../.....',
  '/': '....#/...#./...#./..#../.#.../.#.../#....',
  '\\': '#..../.#.../.#.../..#../...#./...#./....#',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '[': '..###/..#../..#../..#../..#../..#../..###',
  ']': '###../..#../..#../..#../..#../..#../###..',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
  '%': '##..#/##.#./...#./..#../.#.../#.##./#..##',
  '@': '.###./#...#/#.###/#.#.#/#.###/#..../.###.',
  _: '...../...../...../...../...../...../#####',
  "'": '..#../..#../...../...../...../...../.....',
  '"': '.#.#./.#.#./...../...../...../...../.....',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  '|': '..#../..#../..#../..#../..#../..#../..#..',
  $: '..#../.####/#.#../.###./..#.#/####./..#..',
  '~': '...../...../.#..#/#.#.#/#..#./...../.....',
  '^': '..#../.#.#./#...#/...../...../...../.....',
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;

/** The unknown-character box, so a missing glyph is visible rather than blank. */
const FALLBACK = '#####/#...#/#...#/#...#/#...#/#...#/#####';

function glyphFor(character: string): string[] {
  const upper = character.toUpperCase();
  return (GLYPHS[upper] ?? FALLBACK).split('/');
}

export function textWidth(text: string, scale = 1, spacing = 1): number {
  if (text.length === 0) return 0;
  return (text.length * (GLYPH_WIDTH + spacing) - spacing) * scale;
}

/**
 * Draws text onto an image, clipping anything that falls outside it.
 *
 * Clipping rather than refusing: a label that runs off the edge of a chart is a
 * cosmetic problem, and throwing would lose the whole picture over it.
 */
export function drawText(
  image: Image,
  text: string,
  x: number,
  y: number,
  colour: number[],
  scale = 1,
  spacing = 1,
): void {
  let cursor = x;

  for (const character of text) {
    const rows = glyphFor(character);
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const line = rows[row] ?? '';
      for (let column = 0; column < GLYPH_WIDTH; column++) {
        if (line[column] !== '#') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = cursor + column * scale + dx;
            const py = y + row * scale + dy;
            if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
            setPixel(image, px, py, colour);
          }
        }
      }
    }
    cursor += (GLYPH_WIDTH + spacing) * scale;
  }
}
