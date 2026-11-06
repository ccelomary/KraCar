/** Share the same origin policy between customer auth and application mutations. */
export function appOrigins(
  env: Record<string, string | undefined> = process.env,
) {
  if (!env.APP_ORIGIN) return [];
  const configured = new URL(env.APP_ORIGIN);
  const origins = [configured.origin];
  if (
    env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname)
  ) {
    for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
      const local = new URL(configured.origin);
      local.hostname = hostname;
      origins.push(local.origin);
    }
  }
  return [...new Set(origins)];
}
