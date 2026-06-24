import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { MongoClient, ObjectId } from "mongodb";
import { hashPassword } from "@better-auth/utils/password";

const MONGODB_URI =
  "mongodb+srv://nazmulhasannabil4_db_user:PNX9U4g5ENKjYrBu@cluster0.6cwmh5k.mongodb.net/chekin?appName=Cluster0";

const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db();

const email = "admin@chekin.com";
const password = "123";
const name = "Admin";
const orgId = "default-org";

// Remove old user if exists (to re-create with correct hash)
await db.collection("users").deleteOne({ email });
await db.collection("accounts").deleteOne({ accountId: email });

const hashedPassword = await hashPassword(password);
const userId = new ObjectId();
const now = new Date();

await db.collection("users").insertOne({
  _id: userId,
  email,
  name,
  emailVerified: true,
  organizationId: orgId,
  role: "SUPER_ADMIN",
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

await db.collection("accounts").insertOne({
  userId,
  accountId: email,
  providerId: "credential",
  password: hashedPassword,
  createdAt: now,
  updatedAt: now,
});

console.log("✓ Admin account (re)created with correct password hash!");
console.log("  Email:   ", email);
console.log("  Password:", password);
console.log("  Login at: http://localhost:3000/login");

await client.close();
