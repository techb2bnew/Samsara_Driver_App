import { base64ToBytes } from '../src/helpers/base64';

/*
 * Buffer, declared narrowly rather than by widening the project's types.
 *
 * @types/node is in node_modules, but the React Native tsconfig limits global
 * types to jest — deliberately, so nobody reaches for a Node API in app code
 * and finds it compiles. This test runs under Node and needs exactly two
 * methods of it, so it says so here instead.
 */
declare const Buffer: {
  from(input: string | Uint8Array | number[], encoding?: string): {
    toString(encoding: string): string;
    [Symbol.iterator](): Iterator<number>;
  };
};

/**
 * The decoder that turns a photograph into bytes.
 *
 * Tested against Node's own Buffer, which is the reference implementation
 * here — not because the algorithm is subtle, but because the thing it
 * replaced failed SILENTLY. `fetch(fileUri).then(r => r.arrayBuffer())`
 * resolves with an empty buffer in bare React Native, and a zero-byte upload
 * is accepted and stored without complaint. A wrong byte in the middle of a
 * delivery note would be just as quiet.
 */
const asBase64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('base64ToBytes', () => {
  it('decodes an empty string to no bytes', () => {
    expect(base64ToBytes('')).toHaveLength(0);
  });

  it('matches Buffer for every length up to 64', () => {
    /*
     * Every length, because the padding cases are the ones that break: a
     * remainder of 2 characters carries one byte and 3 carries two, and an
     * off-by-one there truncates or invents a byte at the end of every file.
     */
    for (let n = 0; n <= 64; n += 1) {
      const text = 'x'.repeat(n);
      const expected = Uint8Array.from(Buffer.from(text, 'utf8'));
      expect(Array.from(base64ToBytes(asBase64(text)))).toEqual(Array.from(expected));
    }
  });

  it('handles bytes across the whole range, not just text', () => {
    /* A JPEG is not ASCII. 0x00 and 0xFF are the ones that go wrong. */
    const bytes = Uint8Array.from(Array.from({ length: 256 }, (_, i) => i));
    const encoded = Buffer.from(bytes).toString('base64');
    expect(Array.from(base64ToBytes(encoded))).toEqual(Array.from(bytes));
  });

  it('decodes something JPEG-shaped, magic bytes intact', () => {
    /* A real file starts 0xFF 0xD8 0xFF and ends 0xFF 0xD9. If the first or
       last byte is wrong, no viewer will open it. */
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
    const decoded = base64ToBytes(Buffer.from(jpeg).toString('base64'));
    expect(Array.from(decoded)).toEqual(Array.from(jpeg));
  });

  it('tolerates a data: prefix', () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5]);
    const encoded = Buffer.from(bytes).toString('base64');
    expect(Array.from(base64ToBytes(`data:image/jpeg;base64,${encoded}`))).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('tolerates newlines, which some platforms insert', () => {
    const bytes = Uint8Array.from(Array.from({ length: 200 }, (_, i) => i % 256));
    const encoded = Buffer.from(bytes).toString('base64');
    const wrapped = encoded.replace(/(.{40})/g, '$1\n');
    expect(Array.from(base64ToBytes(wrapped))).toEqual(Array.from(bytes));
  });

  it('never pads the tail with zeros when the input is truncated', () => {
    /*
     * A single leftover character carries no whole byte. Returning a buffer
     * with a zero in it would corrupt the file rather than come up short,
     * and a short file at least fails loudly in a viewer.
     */
    expect(base64ToBytes('A')).toHaveLength(0);
    expect(Array.from(base64ToBytes('/w'))).toEqual([0xff]);
  });
});
