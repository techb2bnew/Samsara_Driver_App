import { normaliseMimeType } from '../src/helpers/mime';

/**
 * What a picker says a photo is, against what actually exists.
 *
 * Worth a suite because the failure was a driver at a loading bay being told
 * "mime type image/jpg is not supported" — true, unhelpful, and impossible to
 * act on. And because the tempting fix is the wrong one: widening the bucket
 * to accept image/jpg would store files with a type no viewer recognises.
 */
describe('normaliseMimeType', () => {
  it('turns the type Android sends into the one that exists', () => {
    expect(normaliseMimeType('image/jpg')).toBe('image/jpeg');
  });

  it('leaves a real type alone', () => {
    expect(normaliseMimeType('image/jpeg')).toBe('image/jpeg');
    expect(normaliseMimeType('image/png')).toBe('image/png');
    expect(normaliseMimeType('application/pdf')).toBe('application/pdf');
  });

  it('lowercases, because some platforms shout', () => {
    expect(normaliseMimeType('IMAGE/JPG')).toBe('image/jpeg');
    expect(normaliseMimeType('Image/PNG')).toBe('image/png');
  });

  it('drops parameters, which are legal and meaningless on an image', () => {
    expect(normaliseMimeType('image/jpeg; charset=binary')).toBe('image/jpeg');
  });

  it('maps the HEIF spellings onto the one the bucket takes', () => {
    expect(normaliseMimeType('image/heif')).toBe('image/heic');
    expect(normaliseMimeType('image/heic')).toBe('image/heic');
  });

  it('guesses a photo when the picker said nothing', () => {
    /*
     * An empty content type is stored as application/octet-stream, and every
     * viewer then refuses to draw it. Every path here is a camera or a photo
     * library, so a JPEG is the honest guess.
     */
    expect(normaliseMimeType(undefined)).toBe('image/jpeg');
    expect(normaliseMimeType(null)).toBe('image/jpeg');
    expect(normaliseMimeType('   ')).toBe('image/jpeg');
  });

  it('does not invent a mapping for something it has not seen', () => {
    /* Passing an unknown type through lets storage refuse it with its own
       message, which is better than this file guessing wrong. */
    expect(normaliseMimeType('video/mp4')).toBe('video/mp4');
  });
});
