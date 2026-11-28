import { expect, it } from "vitest";
import * as shared from "./index";

type Input = { filePath: string; titlePath: string[]; runnerProject?: string };

async function fingerprint(input: Input): Promise<string> {
  const candidate = (shared as Record<string, unknown>).fingerprintTest;
  if (typeof candidate !== "function") throw new Error("The shared fingerprintTest export is missing");
  return (candidate as (input: Input) => Promise<string>)(input);
}

const fixture = { runnerProject: "chromium", filePath: "tests/a.spec.ts", titlePath: ["Suite", "works"] };

it("[SC-ING-009] matches the ADR vector for POSIX, Windows and leading-dot paths", async () => {
  const expected = "3970ed22ab93278177c31c8a41e7c3ccea73d25a4423fab3dcc054913797b9f2";
  for (const filePath of [fixture.filePath, "tests\\a.spec.ts", "./tests/a.spec.ts", ".\\tests\\a.spec.ts"]) {
    await expect(fingerprint({ ...fixture, filePath })).resolves.toBe(expected);
  }
});

it("[SC-ING-010] preserves path case and separates runner projects and title path segments", async () => {
  const identities = await Promise.all([
    fingerprint(fixture),
    fingerprint({ ...fixture, runnerProject: "firefox" }),
    fingerprint({ ...fixture, filePath: "Tests/a.spec.ts" }),
    fingerprint({ ...fixture, titlePath: ["Suite works"] }),
    fingerprint({ filePath: fixture.filePath, titlePath: fixture.titlePath }),
  ]);
  expect(new Set(identities).size).toBe(5);
  await expect(fingerprint({ ...fixture, runnerProject: "" })).resolves.toBe(identities[4]);
});
