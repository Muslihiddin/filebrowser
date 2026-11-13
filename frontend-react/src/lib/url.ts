// Port of the helpers of frontend/src/utils/url.ts used so far.

/** Encodes every segment of a path, keeping the slashes. */
export function encodePath(str: string): string {
  return str
    .split('/')
    .map((v) => encodeURIComponent(v))
    .join('/')
}
