import dns from "dns";
import { promisify } from "util";
import "./configure-dns";

const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

let cachedUri: string | undefined;

/**
 * Returns a MongoDB URI safe for local Windows/Docker DNS environments.
 * Converts mongodb+srv:// to mongodb:// using public DNS so the driver
 * never needs a local SRV lookup.
 */
export async function getMongoDbUri(): Promise<string> {
  if (cachedUri) return cachedUri;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (!uri.startsWith("mongodb+srv://")) {
    cachedUri = uri;
    return uri;
  }

  const withoutScheme = uri.slice("mongodb+srv://".length);
  const atIndex = withoutScheme.lastIndexOf("@");
  if (atIndex === -1) {
    throw new Error("Invalid MONGODB_URI: missing credentials host separator");
  }

  const credentials = withoutScheme.slice(0, atIndex + 1);
  const hostAndRest = withoutScheme.slice(atIndex + 1);
  const slashIndex = hostAndRest.indexOf("/");
  const hostname =
    slashIndex === -1 ? hostAndRest.split("?")[0] : hostAndRest.slice(0, slashIndex);
  const pathAndQuery = slashIndex === -1 ? "" : hostAndRest.slice(slashIndex);

  const [srvRecords, txtRecords] = await Promise.all([
    resolveSrv(`_mongodb._tcp.${hostname}`),
    resolveTxt(hostname).catch(() => [] as string[][]),
  ]);

  const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(",");

  const params = new URLSearchParams();
  params.set("ssl", "true");

  if (txtRecords.length > 0) {
    const txtParams = new URLSearchParams(txtRecords[0].join(""));
    for (const [key, value] of txtParams) {
      params.set(key, value);
    }
  }

  const queryIndex = pathAndQuery.indexOf("?");
  if (queryIndex !== -1) {
    const existingParams = new URLSearchParams(pathAndQuery.slice(queryIndex + 1));
    for (const [key, value] of existingParams) {
      params.set(key, value);
    }
  }

  const dbPath = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
  cachedUri = `mongodb://${credentials}${hosts}${dbPath}?${params.toString()}`;
  return cachedUri;
}
