export function logError(scope: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${scope}]`, error);
  }
}
