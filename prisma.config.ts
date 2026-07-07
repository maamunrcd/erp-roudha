import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/** Neon pooler: migrations require direct host; pooled URL cannot acquire advisory locks. */
function directDatabaseUrl(): string {
  const unpooled = process.env.DATABASE_URL_UNPOOLED;
  if (unpooled) return unpooled;

  const pooled = process.env.DATABASE_URL ?? "";
  const usesPooler =
    pooled.includes("-pooler") || pooled.includes("pgbouncer=true");
  if (usesPooler) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is required when DATABASE_URL uses Neon PgBouncer. " +
        "Set it to the direct Neon connection string (host without -pooler)."
    );
  }

  return pooled;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: directDatabaseUrl(),
  },
});
