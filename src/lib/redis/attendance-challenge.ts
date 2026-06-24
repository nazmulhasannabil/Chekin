import redis from "./client";
import { generateId } from "@/lib/utils";

const CHALLENGE_TTL = 120; // seconds

export type LivenessAction = "BLINK" | "TURN_LEFT" | "TURN_RIGHT" | "NOD" | "SMILE";

const LIVENESS_ACTIONS: LivenessAction[] = [
  "BLINK",
  "TURN_LEFT",
  "TURN_RIGHT",
  "NOD",
  "SMILE",
];

function randomLivenessAction(): LivenessAction {
  return LIVENESS_ACTIONS[Math.floor(Math.random() * LIVENESS_ACTIONS.length)];
}

export interface AttendanceChallenge {
  challengeId: string;
  employeeId: string;
  organizationId: string;
  livenessAction: LivenessAction;
  createdAt: number;
  expiresAt: number;
}

export async function createAttendanceChallenge(
  employeeId: string,
  organizationId: string
): Promise<AttendanceChallenge> {
  const challenge: AttendanceChallenge = {
    challengeId: generateId(),
    employeeId,
    organizationId,
    livenessAction: randomLivenessAction(),
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_TTL * 1000,
  };

  await redis.setex(
    `challenge:${challenge.challengeId}`,
    CHALLENGE_TTL,
    JSON.stringify(challenge)
  );

  return challenge;
}

export async function consumeChallenge(
  challengeId: string
): Promise<AttendanceChallenge | null> {
  const key = `challenge:${challengeId}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  // Delete immediately — one-time use
  await redis.del(key);

  const challenge = JSON.parse(raw) as AttendanceChallenge;
  if (Date.now() > challenge.expiresAt) return null;

  return challenge;
}
