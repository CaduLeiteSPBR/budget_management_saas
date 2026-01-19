import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("categories router", () => {
  describe("create category", () => {
    it("should create a new category", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const category = await caller.categories.create({
        name: "Alimentação",
        division: "Pessoal",
        type: "Essencial",
        color: "#FF5733",
        icon: "🍔",
      });

      expect(category).toBeDefined();
      expect(category.name).toBe("Alimentação");
      expect(category.division).toBe("Pessoal");
      expect(category.type).toBe("Essencial");
      expect(category.color).toBe("#FF5733");
      expect(category.icon).toBe("🍔");
      expect(category.userId).toBe(ctx.user.id);
    });

    it("should create category with different divisions", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const pessoal = await caller.categories.create({
        name: "Transporte",
        division: "Pessoal",
        type: "Essencial",
      });

      const familiar = await caller.categories.create({
        name: "Educação",
        division: "Familiar",
        type: "Importante",
      });

      const investimento = await caller.categories.create({
        name: "Ações",
        division: "Investimento",
        type: "Investimento",
      });

      expect(pessoal.division).toBe("Pessoal");
      expect(familiar.division).toBe("Familiar");
      expect(investimento.division).toBe("Investimento");
    });
  });

  describe("list categories", () => {
    it("should list only user's categories", async () => {
      const ctx1 = createTestContext(1);
      const ctx2 = createTestContext(2);
      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      // Create categories for user 1
      await caller1.categories.create({
        name: "User 1 Category",
        division: "Pessoal",
        type: "Essencial",
      });

      // Create categories for user 2
      await caller2.categories.create({
        name: "User 2 Category",
        division: "Familiar",
        type: "Importante",
      });

      // User 1 should only see their categories
      const user1Categories = await caller1.categories.list();
      expect(user1Categories.every(c => c.userId === 1)).toBe(true);
      expect(user1Categories.some(c => c.name === "User 1 Category")).toBe(true);
      expect(user1Categories.some(c => c.name === "User 2 Category")).toBe(false);

      // User 2 should only see their categories
      const user2Categories = await caller2.categories.list();
      expect(user2Categories.every(c => c.userId === 2)).toBe(true);
      expect(user2Categories.some(c => c.name === "User 2 Category")).toBe(true);
      expect(user2Categories.some(c => c.name === "User 1 Category")).toBe(false);
    });
  });

  describe("update category", () => {
    it("should update category name and color", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const category = await caller.categories.create({
        name: "Original Name",
        division: "Pessoal",
        type: "Essencial",
        color: "#000000",
      });

      await caller.categories.update({
        id: category.id,
        name: "Updated Name",
        color: "#FFFFFF",
      });

      const categories = await caller.categories.list();
      const updated = categories.find(c => c.id === category.id);

      expect(updated?.name).toBe("Updated Name");
      expect(updated?.color).toBe("#FFFFFF");
      expect(updated?.division).toBe("Pessoal"); // Should remain unchanged
      expect(updated?.type).toBe("Essencial"); // Should remain unchanged
    });

    it("should not allow updating another user's category", async () => {
      const ctx1 = createTestContext(1);
      const ctx2 = createTestContext(2);
      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      const category = await caller1.categories.create({
        name: "User 1 Category",
        division: "Pessoal",
        type: "Essencial",
      });

      // User 2 tries to update user 1's category
      await caller2.categories.update({
        id: category.id,
        name: "Hacked Name",
      });

      // Verify category was not updated
      const categories = await caller1.categories.list();
      const original = categories.find(c => c.id === category.id);

      expect(original?.name).toBe("User 1 Category"); // Should remain unchanged
    });
  });

  describe("delete category", () => {
    it("should delete own category", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const category = await caller.categories.create({
        name: "To be deleted",
        division: "Pessoal",
        type: "Conforto",
      });

      await caller.categories.delete({ id: category.id });

      const categories = await caller.categories.list();
      const deleted = categories.find(c => c.id === category.id);

      expect(deleted).toBeUndefined();
    });

    it("should not allow deleting another user's category", async () => {
      const ctx1 = createTestContext(1);
      const ctx2 = createTestContext(2);
      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      const category = await caller1.categories.create({
        name: "User 1 Category",
        division: "Pessoal",
        type: "Essencial",
      });

      // User 2 tries to delete user 1's category
      await caller2.categories.delete({ id: category.id });

      // Verify category still exists
      const categories = await caller1.categories.list();
      const stillExists = categories.find(c => c.id === category.id);

      expect(stillExists).toBeDefined();
    });
  });

  describe("category types and divisions", () => {
    it("should support all division types", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const divisions = ["Pessoal", "Familiar", "Investimento"] as const;

      for (const division of divisions) {
        const category = await caller.categories.create({
          name: `Test ${division}`,
          division,
          type: "Essencial",
        });

        expect(category.division).toBe(division);
      }
    });

    it("should support all type categories", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const types = ["Essencial", "Importante", "Conforto", "Investimento"] as const;

      for (const type of types) {
        const category = await caller.categories.create({
          name: `Test ${type}`,
          division: "Pessoal",
          type,
        });

        expect(category.type).toBe(type);
      }
    });
  });
});
