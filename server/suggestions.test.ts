import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("dashboard suggestions", () => {
  describe("generateSuggestions", () => {
    it("returns exactly 3 suggestions", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.generateSuggestions();

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBe(3);
    });

    it("returns non-empty suggestions", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.generateSuggestions();

      result.suggestions.forEach((suggestion: string) => {
        expect(suggestion.length).toBeGreaterThan(0);
        expect(suggestion.trim()).toBe(suggestion); // No leading/trailing spaces
      });
    });

    it("suggestions are concise (max 200 chars)", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.generateSuggestions();

      result.suggestions.forEach((suggestion: string) => {
        expect(suggestion.length).toBeLessThan(200);
      });
    });

    it("suggestions do not contain bullet symbols", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.generateSuggestions();

      result.suggestions.forEach((suggestion: string) => {
        expect(suggestion).not.toMatch(/^[\s•\-*]/); // Should not start with bullet symbols
      });
    });

    it("suggestions are actionable and practical", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.generateSuggestions();

      // Check that suggestions contain action verbs or financial terms
      const actionVerbs = [
        "reduz",
        "aument",
        "analise",
        "busqu",
        "revise",
        "estabele",
        "otimiz",
        "diversif",
        "monitor",
        "avalie",
      ];
      const financialTerms = [
        "gasto",
        "saldo",
        "renda",
        "despesa",
        "investimento",
        "cartão",
        "orçamento",
        "meta",
      ];

      result.suggestions.forEach((suggestion: string) => {
        const lower = suggestion.toLowerCase();
        const hasActionOrTerm = actionVerbs.some((verb) =>
          lower.includes(verb)
        ) || financialTerms.some((term) => lower.includes(term));

        expect(hasActionOrTerm).toBe(true);
      });
    });

    it("returns fallback suggestions on error", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // This test just ensures the function doesn't crash
      const result = await caller.dashboard.generateSuggestions();

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});
