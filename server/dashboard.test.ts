import { describe, expect, it, beforeEach } from "vitest";
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

describe("dashboard preferences", () => {
  describe("getPreferences", () => {
    it("returns default preferences when none exist", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.getPreferences();

      expect(result).toBeDefined();
      expect(result.widgetOrder).toEqual([
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoAtual",
        "saldoMinimo",
        "fimDoMes",
      ]);
      expect(result.hiddenWidgets).toEqual(["saldoMinimo"]);
    });
  });

  describe("updatePreferences", () => {
    it("saves widget order correctly", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const newOrder = [
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoAtual",
        "saldoMinimo",
        "fimDoMes",
      ];

      await caller.dashboard.updatePreferences({
        widgetOrder: newOrder,
        hiddenWidgets: [],
      });

      const result = await caller.dashboard.getPreferences();

      expect(result.widgetOrder).toEqual(newOrder);
      expect(result.hiddenWidgets).toEqual([]);
    });

    it("saves hidden widgets correctly", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const hiddenWidgets = ["saldoMinimo", "fimDoMes"];

      await caller.dashboard.updatePreferences({
        widgetOrder: [
          "saldoInicial",
          "entradas",
          "saidas",
          "saldoMinimo",
          "saldoAtual",
          "fimDoMes",
        ],
        hiddenWidgets,
      });

      const result = await caller.dashboard.getPreferences();

      expect(result.hiddenWidgets).toEqual(hiddenWidgets);
    });

    it("saves both widget order and hidden widgets together", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const newOrder = [
        "saldoAtual",
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoMinimo",
        "fimDoMes",
      ];
      const hiddenWidgets = ["saldoInicial"];

      await caller.dashboard.updatePreferences({
        widgetOrder: newOrder,
        hiddenWidgets,
      });

      const result = await caller.dashboard.getPreferences();

      expect(result.widgetOrder).toEqual(newOrder);
      expect(result.hiddenWidgets).toEqual(hiddenWidgets);
    });

    it("persists preferences across multiple calls", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First update
      const order1 = [
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoAtual",
        "saldoMinimo",
        "fimDoMes",
      ];
      await caller.dashboard.updatePreferences({
        widgetOrder: order1,
        hiddenWidgets: [],
      });

      // Second update
      const order2 = [
        "saldoAtual",
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoMinimo",
        "fimDoMes",
      ];
      const hidden2 = ["saldoMinimo"];
      await caller.dashboard.updatePreferences({
        widgetOrder: order2,
        hiddenWidgets: hidden2,
      });

      const result = await caller.dashboard.getPreferences();

      expect(result.widgetOrder).toEqual(order2);
      expect(result.hiddenWidgets).toEqual(hidden2);
    });

    it("isolates preferences between different users", async () => {
      const ctx1 = createAuthContext(1);
      const ctx2 = createAuthContext(2);
      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      const order1 = [
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoAtual",
        "saldoMinimo",
        "fimDoMes",
      ];
      const order2 = [
        "saldoAtual",
        "entradas",
        "saidas",
        "saldoInicial",
        "saldoMinimo",
        "fimDoMes",
      ];

      await caller1.dashboard.updatePreferences({
        widgetOrder: order1,
        hiddenWidgets: ["saldoMinimo"],
      });

      await caller2.dashboard.updatePreferences({
        widgetOrder: order2,
        hiddenWidgets: ["entradas"],
      });

      const result1 = await caller1.dashboard.getPreferences();
      const result2 = await caller2.dashboard.getPreferences();

      expect(result1.widgetOrder).toEqual(order1);
      expect(result1.hiddenWidgets).toEqual(["saldoMinimo"]);

      expect(result2.widgetOrder).toEqual(order2);
      expect(result2.hiddenWidgets).toEqual(["entradas"]);
    });
  });
});
