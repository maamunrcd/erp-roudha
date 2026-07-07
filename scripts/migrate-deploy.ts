import "dotenv/config";
import { execSync } from "node:child_process";

const pooled = process.env.DATABASE_URL ?? "";
const direct = process.env.DATABASE_URL_UNPOOLED;

if (!direct) {
  const usesPooler =
    pooled.includes("-pooler") || pooled.includes("pgbouncer=true");
  if (usesPooler) {
    console.error(
      "\nDATABASE_URL_UNPOOLED is required when DATABASE_URL uses Neon PgBouncer.",
      "\nPrisma migrate needs a direct (non-pooler) connection.",
      "\nVercel: Project Settings → Environment Variables → add DATABASE_URL_UNPOOLED",
      "\n(Neon direct URL: same as DATABASE_URL but remove -pooler from the host)\n"
    );
    process.exit(1);
  }
}

const migrateUrl = direct ?? pooled;
if (!migrateUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

execSync("prisma migrate deploy", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: migrateUrl,
    DATABASE_URL_UNPOOLED: migrateUrl,
  },
});
