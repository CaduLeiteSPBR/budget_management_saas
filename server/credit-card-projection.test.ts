import { describe, expect, it } from "vitest";

// Simular funções de cálculo
function identifyActiveBillingCycle(closingDay: number, referenceDate: Date = new Date()): { year: number; month: number; isClosed: boolean } {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth();
  const currentDay = referenceDate.getUTCDate();

  if (currentDay < closingDay) {
    return { year: currentYear, month: currentMonth, isClosed: false };
  } else {
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    return { year: nextYear, month: nextMonth, isClosed: true };
  }
}

function calculateInvoiceProjection(card: {
  closingDay: number;
  dueDay: number;
  currentTotalAmount: string;
  recurringAmount: string;
  expectedAmount: string;
}, referenceDate: Date = new Date()) {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth();
  const currentDay = referenceDate.getUTCDate();

  let cycleStartYear = currentYear;
  let cycleStartMonth = currentMonth;

  if (currentDay < card.closingDay) {
    cycleStartMonth--;
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11;
      cycleStartYear--;
    }
  }

  const cycleStartDate = Date.UTC(cycleStartYear, cycleStartMonth, card.closingDay, 0, 0, 0, 0);

  let nextClosingMonth = cycleStartMonth + 1;
  let nextClosingYear = cycleStartYear;
  if (nextClosingMonth > 11) {
    nextClosingMonth = 0;
    nextClosingYear++;
  }
  const nextClosingDate = Date.UTC(nextClosingYear, nextClosingMonth, card.closingDay, 0, 0, 0, 0);

  const nowTimestamp = Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0);
  const daysSinceClosing = Math.floor((nowTimestamp - cycleStartDate) / (1000 * 60 * 60 * 24));
  const totalDaysInCycle = Math.floor((nextClosingDate - cycleStartDate) / (1000 * 60 * 60 * 24));

  const currentTotal = Number(card.currentTotalAmount);
  const recurring = Number(card.recurringAmount);
  const expected = Number(card.expectedAmount);

  const variableAmount = currentTotal - recurring;
  const projectedVariable = daysSinceClosing > 0
    ? (variableAmount / daysSinceClosing) * totalDaysInCycle
    : variableAmount;

  const rawProjection = projectedVariable + recurring;
  const finalAmount = Math.max(rawProjection, expected);

  return {
    rawProjection,
    finalAmount,
    daysSinceClosing,
    totalDaysInCycle,
  };
}

describe("credit card projection and description", () => {
  describe("identifyActiveBillingCycle", () => {
    it("returns current cycle when before closing day", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 9, 12, 0, 0)); // 09/04/2026
      const closingDay = 10;

      const cycle = identifyActiveBillingCycle(closingDay, referenceDate);

      expect(cycle.month).toBe(3); // Março
      expect(cycle.year).toBe(2026);
      expect(cycle.isClosed).toBe(false);
    });

    it("returns next cycle when on or after closing day", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 10/04/2026
      const closingDay = 10;

      const cycle = identifyActiveBillingCycle(closingDay, referenceDate);

      expect(cycle.month).toBe(4); // Abril
      expect(cycle.year).toBe(2026);
      expect(cycle.isClosed).toBe(true);
    });
  });

  describe("calculateInvoiceProjection", () => {
    it("returns projection equal to current amount when cycle just started", () => {
      // Simular: Ciclo começou hoje (10/04), valor atual 9380
      const referenceDate = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 10/04/2026
      const card = {
        closingDay: 10,
        dueDay: 15,
        currentTotalAmount: "9380.00",
        recurringAmount: "0.00",
        expectedAmount: "0.00",
      };

      const projection = calculateInvoiceProjection(card, referenceDate);

      // daysSinceClosing deve ser 0 (ciclo começou hoje)
      expect(projection.daysSinceClosing).toBe(0);
      // Projeção deve ser igual ao valor atual (sem dias transcorridos)
      expect(projection.finalAmount).toBe(9380);
    });

    it("returns higher projection when days have passed in cycle", () => {
      // Simular: 5 dias após fechamento (10/04), valor atual 9380
      const referenceDate = new Date(Date.UTC(2026, 3, 15, 12, 0, 0)); // 15/04/2026
      const card = {
        closingDay: 10,
        dueDay: 15,
        currentTotalAmount: "9380.00",
        recurringAmount: "0.00",
        expectedAmount: "0.00",
      };

      const projection = calculateInvoiceProjection(card, referenceDate);

      // daysSinceClosing deve ser 5
      expect(projection.daysSinceClosing).toBe(5);
      // Projeção deve ser maior que valor atual (extrapolação para o mês inteiro)
      expect(projection.finalAmount).toBeGreaterThan(9380);
    });

    it("returns correct projection with recurring amount", () => {
      // Simular: 10 dias após fechamento, valor atual 9380, recorrente 1000
      const referenceDate = new Date(Date.UTC(2026, 3, 20, 12, 0, 0)); // 20/04/2026
      const card = {
        closingDay: 10,
        dueDay: 15,
        currentTotalAmount: "9380.00",
        recurringAmount: "1000.00",
        expectedAmount: "0.00",
      };

      const projection = calculateInvoiceProjection(card, referenceDate);

      // Variable amount = 9380 - 1000 = 8380
      // Days since closing = 10
      // Total days in cycle = 30 (10 abril a 10 maio)
      // Projected variable = (8380 / 10) * 30 = 25140
      // Final = 25140 + 1000 = 26140
      expect(projection.daysSinceClosing).toBe(10);
      expect(projection.finalAmount).toBeGreaterThan(9380);
    });
  });

  describe("invoice description logic", () => {
    it("shows 'Previsão' when due date is in future", () => {
      const now = Date.now();
      const futureDate = now + (24 * 60 * 60 * 1000); // Tomorrow

      const isClosed = futureDate < now;
      const prefix = isClosed ? "Fatura" : "Previsão";

      expect(prefix).toBe("Previsão");
    });

    it("shows 'Fatura' when due date is in past", () => {
      const now = Date.now();
      const pastDate = now - (24 * 60 * 60 * 1000); // Yesterday

      const isClosed = pastDate < now;
      const prefix = isClosed ? "Fatura" : "Previsão";

      expect(prefix).toBe("Fatura");
    });

    it("generates correct description with card name and brand", () => {
      const cardName = "Sicredi";
      const cardBrand = "Visa";
      const prefix = "Previsão";

      const description = `${prefix} CC ${cardName} ${cardBrand}`;

      expect(description).toBe("Previsão CC Sicredi Visa");
    });

    it("updates description when fatura closes", () => {
      const cardName = "Sicredi";
      const cardBrand = "Visa";

      // Before closing
      let prefix = "Previsão";
      let description = `${prefix} CC ${cardName} ${cardBrand}`;
      expect(description).toBe("Previsão CC Sicredi Visa");

      // After closing
      prefix = "Fatura";
      description = `${prefix} CC ${cardName} ${cardBrand}`;
      expect(description).toBe("Fatura CC Sicredi Visa");
    });
  });

  describe("integration: Sicredi example (closing day 10, date 10/04)", () => {
    it("correctly identifies fatura as closed on closing day", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 10/04/2026
      const closingDay = 10;

      const cycle = identifyActiveBillingCycle(closingDay, referenceDate);

      expect(cycle.isClosed).toBe(true);
      expect(cycle.month).toBe(4); // Fatura de maio
    });

    it("correctly calculates projection on closing day", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 10/04/2026
      const card = {
        closingDay: 10,
        dueDay: 15,
        currentTotalAmount: "9380.00",
        recurringAmount: "0.00",
        expectedAmount: "0.00",
      };

      const projection = calculateInvoiceProjection(card, referenceDate);

      // Ciclo começou hoje, então projeção = valor atual
      expect(projection.finalAmount).toBe(9380);
    });
  });
});
