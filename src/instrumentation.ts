export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getMongoDbUri } = await import("@/lib/db/resolve-mongodb-uri");
    await getMongoDbUri();
  }
}
