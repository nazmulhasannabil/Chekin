import type { ConfidenceInput, ConfidenceWeights } from "@/types";

const DEFAULT_WEIGHTS: ConfidenceWeights = {
  face: 0.35,
  liveness: 0.25,
  device: 0.15,
  geofence: 0.15,
  network: 0.10,
};

export interface ConfidenceResult {
  score: number;           // 0–1
  passed: boolean;
  breakdown: {
    face: number;
    liveness: number;
    device: number;
    geofence: number;
    network: number;
  };
  explanation: string;
}

export function calculateConfidenceScore(
  input: ConfidenceInput,
  threshold = 0.6
): ConfidenceResult {
  const w = { ...DEFAULT_WEIGHTS, ...input.weights };

  // Normalize weights to sum to 1
  const total = w.face + w.liveness + w.device + w.geofence + w.network;
  const normalizedW = {
    face: w.face / total,
    liveness: w.liveness / total,
    device: w.device / total,
    geofence: w.geofence / total,
    network: w.network / total,
  };

  // Calculate each signal contribution
  const faceContrib = input.faceMatched ? normalizedW.face * Math.min(1, input.faceScore) : 0;
  const livenessContrib = input.livenessPassed ? normalizedW.liveness : 0;
  const deviceContrib = input.deviceTrusted ? normalizedW.device : 0;
  const geofenceContrib = input.insideGeofence ? normalizedW.geofence : 0;
  const networkContrib = input.knownIp ? normalizedW.network : 0;

  const score = faceContrib + livenessContrib + deviceContrib + geofenceContrib + networkContrib;

  const breakdown = {
    face: Math.round(faceContrib * 100),
    liveness: Math.round(livenessContrib * 100),
    device: Math.round(deviceContrib * 100),
    geofence: Math.round(geofenceContrib * 100),
    network: Math.round(networkContrib * 100),
  };

  const parts: string[] = [];
  if (!input.faceMatched) parts.push("face verification failed");
  if (!input.livenessPassed) parts.push("liveness check not passed");
  if (!input.deviceTrusted) parts.push("device not trusted");
  if (!input.insideGeofence) parts.push("outside office geofence");
  if (!input.knownIp) parts.push("unrecognized network");

  const explanation =
    parts.length === 0
      ? `All verification signals passed. Confidence: ${Math.round(score * 100)}%.`
      : `Low confidence (${Math.round(score * 100)}%) due to: ${parts.join(", ")}.`;

  return {
    score: Math.round(score * 1000) / 1000,
    passed: score >= threshold,
    breakdown,
    explanation,
  };
}

/**
 * Build a confidence input for passkey-only (no face) check-ins.
 * Face and liveness are treated as passed when biometrics are not required.
 */
export function buildPasskeyOnlyConfidence(
  deviceTrusted: boolean,
  insideGeofence: boolean,
  knownIp: boolean,
  weights?: ConfidenceWeights
): ConfidenceInput {
  return {
    faceMatched: true,
    faceScore: 1.0,
    livenessPassed: true,
    deviceTrusted,
    insideGeofence,
    knownIp,
    weights: weights ?? {
      face: 0,
      liveness: 0,
      device: 0.5,
      geofence: 0.3,
      network: 0.2,
    },
  };
}
