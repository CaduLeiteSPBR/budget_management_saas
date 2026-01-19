import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== ADMIN ====================
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ==================== CATEGORIES ====================
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserCategories(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createCategory({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCategory(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== TRANSACTIONS ====================
  transactions: router({
    list: protectedProcedure
      .input(z.object({
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserTransactions(
          ctx.user.id,
          input?.startDate,
          input?.endDate
        );
      }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        nature: z.enum(["Entrada", "Saída"]),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        date: z.number(),
        notes: z.string().optional(),
        paymentType: z.enum(["single", "installment", "recurring"]),
        installments: z.number().min(2).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { paymentType, installments, ...transactionData } = input;

        // Criar transação principal
        const transaction = await db.createTransaction({
          userId: ctx.user.id,
          ...transactionData,
        });

        // Se for parcelado, criar as parcelas futuras
        if (paymentType === "installment" && installments) {
          const installmentAmount = (Number(input.amount) / installments).toFixed(2);
          const baseDate = new Date(input.date);
          
          // Criar parcelas futuras (começa do mês seguinte)
          for (let i = 1; i < installments; i++) {
            const futureDate = new Date(baseDate);
            futureDate.setUTCMonth(futureDate.getUTCMonth() + i);
            
            await db.createTransaction({
              userId: ctx.user.id,
              description: `${input.description} (${i + 1}/${installments})`,
              amount: installmentAmount,
              nature: input.nature,
              categoryId: input.categoryId,
              division: input.division,
              type: input.type,
              date: futureDate.getTime(),
              notes: input.notes ? `${input.notes} | Parcela ${i + 1}/${installments}` : `Parcela ${i + 1}/${installments}`,
            });
          }

          // Atualizar primeira transação com informação de parcela
          await db.updateTransaction(transaction.id, ctx.user.id, {
            description: `${input.description} (1/${installments})`,
            amount: installmentAmount,
            notes: input.notes ? `${input.notes} | Parcela 1/${installments}` : `Parcela 1/${installments}`,
          });
        }

        // Se for recorrente, criar assinatura
        if (paymentType === "recurring") {
          const baseDate = new Date(input.date);
          await db.createSubscription({
            userId: ctx.user.id,
            description: input.description,
            currentAmount: input.amount,
            dayOfMonth: baseDate.getUTCDate(),
            categoryId: input.categoryId,
            division: input.division,
            type: input.type,
            startDate: input.date,
            notes: input.notes,
          });
        }

        // Registrar padrão para IA
        if (input.categoryId || input.division || input.type) {
          await db.recordAiLearning({
            userId: ctx.user.id,
            description: input.description,
            nature: input.nature,
            categoryId: input.categoryId,
            division: input.division,
            type: input.type,
          });
        }

        return transaction;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        date: z.number().optional(),
        isPaid: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTransaction(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTransaction(input.id, ctx.user.id);
        return { success: true };
      }),

    balance: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBalance(ctx.user.id);
    }),
  }),

  // ==================== SUBSCRIPTIONS ====================
  subscriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSubscriptions(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        currentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        startDate: z.number(),
        dayOfMonth: z.number().min(1).max(31),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createSubscription({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateSubscription(id, ctx.user.id, data);
        return { success: true };
      }),

    updateAmount: protectedProcedure
      .input(z.object({
        id: z.number(),
        newAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        effectiveDate: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSubscriptionAmount(
          input.id,
          ctx.user.id,
          input.newAmount,
          input.effectiveDate
        );
        return { success: true };
      }),

    history: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubscriptionHistory(input.id);
      }),
  }),

  // ==================== INSTALLMENTS ====================
  installments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserInstallments(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        totalInstallments: z.number().min(2).max(60),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        firstDueDate: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const installmentAmount = (Number(input.totalAmount) / input.totalInstallments).toFixed(2);
        
        return await db.createInstallment({
          userId: ctx.user.id,
          ...input,
          installmentAmount,
        });
      }),

    transactions: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInstallmentTransactions(input.id);
      }),
  }),

  // ==================== BUDGETS ====================
  budgets: router({
    list: protectedProcedure
      .input(z.object({
        monthYear: z.string().regex(/^\d{4}-\d{2}$/), // "2026-01"
      }))
      .query(async ({ ctx, input }) => {
        return await db.getUserBudgets(ctx.user.id, input.monthYear);
      }),

    createOrUpdate: protectedProcedure
      .input(z.object({
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        targetPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
        monthYear: z.string().regex(/^\d{4}-\d{2}$/),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createOrUpdateBudget({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  // ==================== AI SUGGESTIONS ====================
  ai: router({
    suggest: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
      }))
      .query(async ({ ctx, input }) => {
        // Buscar padrões aprendidos
        const patterns = await db.getAiLearningPatterns(ctx.user.id, input.description);
        
        if (patterns.length > 0) {
          const best = patterns[0]!;
          return {
            nature: best.nature,
            categoryId: best.categoryId,
            division: best.division,
            type: best.type,
            confidence: "high",
            source: "learned",
          };
        }

        // Usar IA para sugerir categorização
        try {
          const userCategories = await db.getUserCategories(ctx.user.id);
          const categoriesContext = userCategories.length > 0
            ? `Categorias disponíveis do usuário: ${userCategories.map(c => `${c.name} (${c.division} - ${c.type})`).join(", ")}`
            : "Usuário ainda não possui categorias customizadas.";

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um assistente financeiro que categoriza lançamentos. Analise a descrição e sugira:
- nature: "Entrada" ou "Saída"
- division: "Pessoal", "Familiar" ou "Investimento"
- type: "Essencial", "Importante", "Conforto" ou "Investimento"
- categoryName: nome sugerido para categoria (se aplicável)

${categoriesContext}

Retorne apenas JSON válido.`,
              },
              {
                role: "user",
                content: `Categorize: "${input.description}"`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "categorization",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    nature: {
                      type: "string",
                      enum: ["Entrada", "Saída"],
                    },
                    division: {
                      type: "string",
                      enum: ["Pessoal", "Familiar", "Investimento"],
                    },
                    type: {
                      type: "string",
                      enum: ["Essencial", "Importante", "Conforto", "Investimento"],
                    },
                    categoryName: {
                      type: "string",
                    },
                  },
                  required: ["nature", "division", "type", "categoryName"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          const contentStr = typeof content === 'string' ? content : '{}';
          const suggestion = JSON.parse(contentStr);
          
          // Tentar encontrar categoria existente que corresponda
          let categoryId: number | undefined;
          const matchingCategory = userCategories.find(
            c => c.division === suggestion.division && c.type === suggestion.type
          );
          if (matchingCategory) {
            categoryId = matchingCategory.id;
          }

          return {
            nature: suggestion.nature as "Entrada" | "Saída",
            categoryId,
            division: suggestion.division as "Pessoal" | "Familiar" | "Investimento",
            type: suggestion.type as "Essencial" | "Importante" | "Conforto" | "Investimento",
            suggestedCategoryName: suggestion.categoryName,
            confidence: "medium",
            source: "ai",
          };
        } catch (error) {
          console.error("AI suggestion error:", error);
          // Fallback para sugestão padrão
          return {
            nature: "Saída" as const,
            division: "Pessoal" as const,
            type: "Essencial" as const,
            confidence: "low",
            source: "default",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
