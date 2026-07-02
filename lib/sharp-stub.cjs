/**
 * Truthy stand-in for the `sharp` image library, wired in via a webpack alias in
 * next.config.mjs (server build only).
 *
 * WHY THIS EXISTS
 * `@xenova/transformers` (used by lib/embeddings.mjs for on-device text
 * embeddings) statically imports `sharp` at the top of its `utils/image.js`:
 *
 *     import sharp from 'sharp';
 *     ...
 *     } else if (sharp) { ...set up image loader... }
 *     else { throw new Error('Unable to load image processing library.'); }
 *
 * sharp is ONLY ever *called* inside image-decoding paths (RawImage.read etc.).
 * We do TEXT feature-extraction exclusively and never touch those paths — but
 * the bare `import` alone eagerly loads sharp's native `.node` binary, and that
 * binary is not reliably present/bundled on Vercel. The failing import threw
 * before a single embedding could run, which surfaced in the chat as
 * "temporary problem looking up colleges" (retrieval → embed → throw).
 *
 * Aliasing `sharp` to this module removes the native dependency entirely:
 *   - it exports a TRUTHY default, so image.js takes the `else if (sharp)`
 *     branch and does NOT throw "Unable to load image processing library" at
 *     module-load time;
 *   - it never loads any native binary;
 *   - if image code were ever actually invoked it fails loudly instead of
 *     silently returning garbage.
 *
 * This only affects the module graph webpack bundles for our routes. Next.js's
 * own image optimizer loads the real `sharp` from node_modules at runtime,
 * outside this bundle, so next/image is unaffected.
 */
function sharpStub() {
  throw new Error(
    'sharp is stubbed out in this build (text-only embeddings; no image processing). ' +
      'If you need image support, remove the sharp alias in next.config.mjs and install sharp.'
  );
}

module.exports = sharpStub;
module.exports.default = sharpStub;
