import { describe, expect, it } from "vitest";
import * as db from "./db";

describe("billing period calculation", () => {
  describe("calculateBillingPeriod", () => {
    it("returns current month when today >= closing day", () => {
      // Simular 10 de abril com fechamento no dia 10
      const referenceDate = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 10/04/2026
      const closingDay = 10;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);

      expect(period.month).toBe(4); // Abril
      expect(period.year).toBe(2026);
    });

    it("returns previous month when today < closing day", () => {
      // Simular 9 de abril com fechamento no dia 10
      const referenceDate = new Date(Date.UTC(2026, 3, 9, 12, 0, 0)); // 09/04/2026
      const closingDay = 10;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);

      expect(period.month).toBe(3); // Março
      expect(period.year).toBe(2026);
    });

    it("handles year boundary correctly when going to previous year", () => {
      // Simular 5 de janeiro com fechamento no dia 10
      const referenceDate = new Date(Date.UTC(2026, 0, 5, 12, 0, 0)); // 05/01/2026
      const closingDay = 10;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);

      expect(period.month).toBe(12); // Dezembro
      expect(period.year).toBe(2025);
    });

    it("handles year boundary correctly when going to next month", () => {
      // Simular 15 de dezembro com fechamento no dia 10
      const referenceDate = new Date(Date.UTC(2025, 11, 15, 12, 0, 0)); // 15/12/2025
      const closingDay = 10;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);

      expect(period.month).toBe(12); // Dezembro
      expect(period.year).toBe(2025);
    });

    it("returns current month when today equals closing day", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 15, 0, 0, 0)); // 15/04/2026
      const closingDay = 15;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);

      expect(period.month).toBe(4); // Abril
      expect(period.year).toBe(2026);
    });

    it("handles closing day 31 correctly", () => {
      // Simular 30 de abril com fechamento no dia 31
      const referenceDate = new Date(Date.UTC(2026, 3, 30, 12, 0, 0)); // 30/04/2026
      const closingDay = 31;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);

      expect(period.month).toBe(3); // Março
      expect(period.year).toBe(2026);
    });
  });

  describe("getBillingPeriodDates", () => {
    it("returns correct date range for billing period", () => {
      const closingDay = 10;
      const month = 4; // Abril
      const year = 2026;

      const dates = db.getBillingPeriodDates(closingDay, month, year);

      // Início: 10 de março de 2026
      const expectedStart = Date.UTC(2026, 2, 10, 0, 0, 0, 0);
      // Término: 10 de abril de 2026
      const expectedEnd = Date.UTC(2026, 3, 10, 23, 59, 59, 999);

      expect(dates.start).toBe(expectedStart);
      expect(dates.end).toBe(expectedEnd);
    });

    it("handles month with fewer days than closing day", () => {
      const closingDay = 31;
      const month = 3; // Março
      const year = 2026;

      const dates = db.getBillingPeriodDates(closingDay, month, year);

      // Início: 28 de fevereiro (último dia de fevereiro em 2026)
      const expectedStart = Date.UTC(2026, 1, 28, 0, 0, 0, 0);
      // Término: 31 de março
      const expectedEnd = Date.UTC(2026, 2, 31, 23, 59, 59, 999);

      expect(dates.start).toBe(expectedStart);
      expect(dates.end).toBe(expectedEnd);
    });

    it("handles leap year correctly", () => {
      const closingDay = 29;
      const month = 3; // Março
      const year = 2024; // Leap year

      const dates = db.getBillingPeriodDates(closingDay, month, year);

      // Início: 29 de fevereiro (leap year)
      const expectedStart = Date.UTC(2024, 1, 29, 0, 0, 0, 0);
      // Término: 29 de março
      const expectedEnd = Date.UTC(2024, 2, 29, 23, 59, 59, 999);

      expect(dates.start).toBe(expectedStart);
      expect(dates.end).toBe(expectedEnd);
    });
  });

  describe("integration: calculateBillingPeriod + getBillingPeriodDates", () => {
    it("returns correct period and dates for Sicredi example (closing day 10, date 10/04)", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 10/04/2026
      const closingDay = 10;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);
      const dates = db.getBillingPeriodDates(closingDay, period.month, period.year);

      // Should return April billing period (10/03 to 10/04)
      expect(period.month).toBe(4);
      expect(period.year).toBe(2026);

      // Verify dates
      const expectedStart = Date.UTC(2026, 2, 10, 0, 0, 0, 0);
      const expectedEnd = Date.UTC(2026, 3, 10, 23, 59, 59, 999);

      expect(dates.start).toBe(expectedStart);
      expect(dates.end).toBe(expectedEnd);
    });

    it("returns correct period and dates for day before closing (Sicredi example)", () => {
      const referenceDate = new Date(Date.UTC(2026, 3, 9, 12, 0, 0)); // 09/04/2026
      const closingDay = 10;

      const period = db.calculateBillingPeriod(closingDay, referenceDate);
      const dates = db.getBillingPeriodDates(closingDay, period.month, period.year);

      // Should return March billing period (10/02 to 10/03)
      expect(period.month).toBe(3);
      expect(period.year).toBe(2026);

      // Verify dates
      const expectedStart = Date.UTC(2026, 1, 10, 0, 0, 0, 0);
      const expectedEnd = Date.UTC(2026, 2, 10, 23, 59, 59, 999);

      expect(dates.start).toBe(expectedStart);
      expect(dates.end).toBe(expectedEnd);
    });
  });
});
