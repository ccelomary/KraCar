/** Keep rental collections separate from the original marketplace collections. */
export function rentalMongoUri(
  env: Record<string, string | undefined> = process.env,
) {
  const uri = env.KRACAR_MONGODB_URI || env.MONGODB_URI;
  // WHATWG URL rejects standard MongoDB URIs with multiple replica-set hosts.
  const parts = uri?.match(
    /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/([^?]*))?(\?.*)?$/,
  );
  if (!parts)
    throw new Error(
      "Configure MONGODB_URI (or KRACAR_MONGODB_URI) with a MongoDB replica set.",
    );
  const database = env.KRACAR_MONGODB_DB
    ? encodeURIComponent(env.KRACAR_MONGODB_DB)
    : (env.KRACAR_MONGODB_URI && parts[2]) || "kracar_core";
  return `${parts[1]}/${database}${parts[3] || ""}`;
}
