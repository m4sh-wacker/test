import { asBytes } from './bytes';
import { imageMime } from './imageSignature';

/**
 * The interface's view of "is this a picture?".
 *
 * A thin wrapper so the output pane does not have to know that the engine deals
 * in byte strings, or import a codec to ask a one-line question.
 */
export function imageMimeOf(byteString: string): string | null {
  if (byteString.length === 0) return null;
  return imageMime(asBytes(byteString));
}
