import { decryptDescriptor, euclideanDistance } from "./encryption";
import type { EncryptedData } from "./encryption";

const MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD ?? "0.6");

export interface VerificationResult {
  matched: boolean;
  distance: number;
  score: number;  // 0–1, higher is more confident
  threshold: number;
}

/**
 * Compare a captured face descriptor against an encrypted stored template.
 * Returns a result with match status and confidence score.
 */
export function verifyFace(
  capturedDescriptor: Float32Array,
  encryptedTemplate: EncryptedData
): VerificationResult {
  const storedDescriptor = decryptDescriptor(encryptedTemplate);
  const distance = euclideanDistance(capturedDescriptor, storedDescriptor);

  // Convert distance to a 0-1 score (lower distance = higher confidence)
  // Typical face-api.js distances: < 0.4 = strong match, 0.4-0.6 = probable match, > 0.6 = no match
  const score = Math.max(0, 1 - distance / MATCH_THRESHOLD);

  return {
    matched: distance < MATCH_THRESHOLD,
    distance: Math.round(distance * 1000) / 1000,
    score: Math.round(score * 1000) / 1000,
    threshold: MATCH_THRESHOLD,
  };
}

/**
 * Extract face descriptor from a base64 image using face-api.js.
 * This runs server-side in a dedicated API route.
 */
export async function extractFaceDescriptor(
  imageBase64: string
): Promise<{ descriptor: Float32Array | null; error?: string }> {
  try {
    // Dynamic import to avoid bundling tfjs in all server code
    const faceapi = await import("@vladmandic/face-api/dist/face-api.node.js" as string);
    const tf = await import("@tensorflow/tfjs-node");
    const path = await import("path");
    const fs = await import("fs");

    // Load models on first call
    const modelsPath = path.join(process.cwd(), "public", "face-models");
    if (!fs.existsSync(modelsPath)) {
      return { descriptor: null, error: "Face models not found. Run setup script." };
    }

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);

    // Decode base64 image to tensor
    const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const decoded = tf.node.decodeImage(imageBuffer, 3) as unknown as Parameters<typeof faceapi.detectSingleFace>[0];

    const detection = await faceapi
      .detectSingleFace(decoded)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return { descriptor: null, error: "No face detected in the image." };
    }

    return { descriptor: detection.descriptor };
  } catch (err) {
    console.error("[extractFaceDescriptor]", err);
    return {
      descriptor: null,
      error:
        "Face processing failed. Ensure @vladmandic/face-api and @tensorflow/tfjs-node are installed.",
    };
  }
}
