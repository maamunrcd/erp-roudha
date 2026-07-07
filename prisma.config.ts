import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/** Neon pooler: migrations use direct host when set; otherwise same as DATABASE_URL. */
function directDatabaseUrl(): string {
  return process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
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
