// Values provided by test/global-setup.ts to every test file via Vitest's `inject()`.
declare module "vitest" {
  export interface ProvidedContext {
    pgAdminUrl: string;
  }
}

export {};
