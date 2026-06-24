import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_ID = "v1";

function getEncryptionKey(): Buffer {
  const keyHex = process.env.FACE_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 64) {
    throw new Error("FACE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(keyHex.slice(0, 64), "hex");
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

export function encryptDescriptor(descriptor: Float32Array): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const jsonStr = JSON.stringify(Array.from(descriptor));
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyId: KEY_ID,
  };
}

export function decryptDescriptor(data: EncryptedData): Float32Array {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(data.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data.ciphertext, "base64")),
    decipher.final(),
  ]);

  const arr: number[] = JSON.parse(decrypted.toString("utf8"));
  return new Float32Array(arr);
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error("Descriptor length mismatch");
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}
