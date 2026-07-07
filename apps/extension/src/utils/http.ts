const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/host\.docker\.internal(:\d+)?$/,
  /^https:\/\/([\w-]+\.)*cliqrelay\.com$/,
];

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}
