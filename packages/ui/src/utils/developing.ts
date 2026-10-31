/**
 * Whether the host is a development build, for a warning a component gives
 * only there. A bundler replaces `process.env.NODE_ENV` with a literal, so the
 * check costs nothing in a production build and is true in development. It is
 * NOT guarded with `typeof process`: that expression is not replaced, and in
 * a browser it is 'undefined' even in development, which would silence the
 * warning everywhere. An ESM host with no bundler has no `process` at all, and
 * the ReferenceError reads as not developing.
 */
export function developing(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}
