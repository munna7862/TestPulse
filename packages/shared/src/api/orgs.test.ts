import { describe, expect, it } from "vitest";
import { CreateOrgBodySchema, hasOrgRole, OrgIdSchema, OrgSlugSchema, rolesAtLeast, slugify } from "./orgs";

describe("slugify", () => {
  it("[SC-ORG-001] lowercases, strips accents and collapses separators", () => {
    expect(slugify("Acme QA Team")).toBe("acme-qa-team");
    expect(slugify("  Derived  NAME  ")).toBe("derived-name");
    expect(slugify("Café Ünïcode")).toBe("cafe-unicode");
    expect(slugify("--Edge__case--")).toBe("edge-case");
  });

  it("[SC-ORG-001] caps the slug at 48 characters without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(47)} bcd`);
    expect(slug).toBe("a".repeat(47));
    expect(OrgSlugSchema.safeParse(slug).success).toBe(true);
  });

  it("[SC-ORG-001] falls back to 'org' when nothing usable remains", () => {
    expect(slugify("!!! ???")).toBe("org");
    expect(slugify("日本語")).toBe("org");
  });

  it("[SC-ORG-001] always yields a slug the schema accepts", () => {
    for (const name of ["Acme", "x", "A-B-C", "  Spaces  ", "%%%", "Ω mega"]) {
      expect(OrgSlugSchema.safeParse(slugify(name)).success).toBe(true);
    }
  });
});

describe("org schemas", () => {
  it("[SC-ORG-001] rejects malformed slugs and blank names", () => {
    for (const slug of ["Upper", "two--hyphens", "-lead", "trail-", "sp ace", "a".repeat(49)]) {
      expect(OrgSlugSchema.safeParse(slug).success).toBe(false);
    }
    expect(CreateOrgBodySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(CreateOrgBodySchema.safeParse({ name: "  Trimmed  " }).data).toEqual({ name: "Trimmed" });
  });
});

describe("hasOrgRole", () => {
  it("[SC-SEC-002] ranks OWNER > ADMIN > MEMBER > VIEWER", () => {
    expect(hasOrgRole("OWNER", "ADMIN")).toBe(true);
    expect(hasOrgRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasOrgRole("MEMBER", "ADMIN")).toBe(false);
    expect(hasOrgRole("VIEWER", "VIEWER")).toBe(true);
    expect(hasOrgRole("VIEWER", "MEMBER")).toBe(false);
    expect(hasOrgRole("ADMIN", "OWNER")).toBe(false);
  });
});

describe("rolesAtLeast", () => {
  it("[SC-SEC-002] lists every role meeting the minimum", () => {
    expect(rolesAtLeast("VIEWER")).toEqual(["VIEWER", "MEMBER", "ADMIN", "OWNER"]);
    expect(rolesAtLeast("ADMIN")).toEqual(["ADMIN", "OWNER"]);
    expect(rolesAtLeast("OWNER")).toEqual(["OWNER"]);
  });
});

describe("OrgIdSchema", () => {
  it("[SC-SEC-001] accepts UUIDs (v4 and v7) and rejects anything else", () => {
    expect(OrgIdSchema.safeParse("01999999-0000-7000-8000-000000000000").success).toBe(true);
    expect(OrgIdSchema.safeParse("3b241101-e2bb-4255-8caf-4136c566a962").success).toBe(true);
    for (const id of ["", "not-an-id", "a\u0000b", "3b241101-e2bb-4255-8caf-4136c566a96"]) {
      expect(OrgIdSchema.safeParse(id).success).toBe(false);
    }
  });
});
