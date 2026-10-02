/**
 * Deterministic local development seed (`npm run db:seed`). Idempotent: safe to run repeatedly.
 * Extended in P04-S01 with runs, results, flaky patterns, shards and quarantines.
 */
import { faker } from "@faker-js/faker";
import { createPrismaClient } from "../src/client";

faker.seed(20261002);

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL to seed the database.");
const db = createPrismaClient(url);

const DEMO_ORG_SLUG = "acme";

try {
  const owner = await db.user.upsert({
    where: { email: "owner@acme.test" },
    update: {},
    create: { email: "owner@acme.test", name: "Quinn Owner", emailVerifiedAt: new Date("2026-01-01T00:00:00Z") },
  });
  const member = await db.user.upsert({
    where: { email: "sdet@acme.test" },
    update: {},
    create: { email: "sdet@acme.test", name: faker.person.fullName(), emailVerifiedAt: new Date("2026-01-01T00:00:00Z") },
  });

  const org = await db.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {},
    create: { name: "Acme Inc", slug: DEMO_ORG_SLUG },
  });

  for (const [userId, role] of [
    [owner.id, "OWNER"],
    [member.id, "MEMBER"],
  ] as const) {
    await db.orgMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId } },
      update: { role },
      create: { orgId: org.id, userId, role },
    });
  }

  for (const slug of ["web-app", "mobile-api"]) {
    await db.project.upsert({
      where: { orgId_slug: { orgId: org.id, slug } },
      update: {},
      create: { orgId: org.id, slug, name: slug },
    });
  }

  console.info(`Seeded org "${org.slug}" with 2 users and 2 projects.`);
} finally {
  await db.$disconnect();
}
