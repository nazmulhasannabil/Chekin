import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { passkey } from "@better-auth/passkey";
import { twoFactor } from "better-auth/plugins/two-factor";
import { MongoClient } from "mongodb";
import { getMongoDbUri } from "@/lib/db/resolve-mongodb-uri";

const client = new MongoClient(await getMongoDbUri());

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      const { sendEmail } = await import("@/lib/notifications/email");
      await sendEmail({
        to: user.email,
        subject: "Reset your Chekin password",
        html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh daily
  },

  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: true,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "EMPLOYEE",
      },
      employeeId: {
        type: "string",
        required: false,
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        input: false,
        defaultValue: true,
      },
    },
  },

  plugins: [
    passkey({
      rpName: "Chekin",
      rpID: process.env.NODE_ENV === "production"
        ? new URL(process.env.BETTER_AUTH_URL!).hostname
        : "localhost",
      origin: process.env.BETTER_AUTH_URL!,
    }),
    twoFactor({
      issuer: "Chekin",
      totpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],

  trustedOrigins: [process.env.BETTER_AUTH_URL!],

  advanced: {
    cookiePrefix: "chekin",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

export type Auth = typeof auth;
