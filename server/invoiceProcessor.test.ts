import { describe, it, expect } from "vitest";
import { processCSVInvoice, processOFXInvoice } from "./invoiceProcessor";

describe("Invoice Processor", () => {
  describe("processCSVInvoice", () => {
    it("deve processar CSV com colunas padrão", async () => {
      const csvContent = `descricao,valor,tipo
Restaurante XYZ,150.50,compra
Supermercado ABC,320.00,compra
Estorno Loja DEF,50.00,estorno`;

      const transactions = await processCSVInvoice(csvContent, "Nubank");

      expect(transactions).toHaveLength(3);
      expect(transactions[0].description).toContain("CC - Nubank - Restaurante XYZ");
      expect(transactions[0].amount).toBe(150.50);
      expect(transactions[0].nature).toBe("Saída");
      expect(transactions[2].nature).toBe("Entrada"); // Estorno
    });

    it("deve ignorar linhas vazias e inválidas", async () => {
      const csvContent = `descricao,valor
Compra válida,100.00

,0
Outra compra,200.50`;

      const transactions = await processCSVInvoice(csvContent, "Itaú");

      expect(transactions.length).toBeGreaterThan(0);
      transactions.forEach((t) => {
        expect(t.amount).toBeGreaterThan(0);
        expect(t.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("processOFXInvoice", () => {
    it("deve processar arquivo OFX básico", async () => {
      const ofxContent = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTTRN>
        <TRNAMT>-150.50</TRNAMT>
        <MEMO>Restaurante XYZ</MEMO>
      </STMTTRN>
      <STMTTRN>
        <TRNAMT>50.00</TRNAMT>
        <NAME>Estorno Loja ABC</NAME>
      </STMTTRN>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

      const transactions = await processOFXInvoice(ofxContent, "Bradesco");

      expect(transactions).toHaveLength(2);
      expect(transactions[0].description).toContain("CC - Bradesco - Restaurante XYZ");
      expect(transactions[0].amount).toBe(150.50);
      expect(transactions[0].nature).toBe("Saída");
      expect(transactions[1].nature).toBe("Entrada");
    });

    it("deve retornar array vazio para OFX sem transações", async () => {
      const ofxContent = `<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>`;

      const transactions = await processOFXInvoice(ofxContent, "Banco");

      expect(transactions).toHaveLength(0);
    });
  });

  describe("Formatação de descrição", () => {
    it("deve incluir prefixo CC e nome do banco", async () => {
      const csvContent = `descricao,valor
Compra Teste,100.00`;

      const transactions = await processCSVInvoice(csvContent, "Santander");

      expect(transactions[0].description).toBe("CC - Santander - Compra Teste");
    });
  });

  describe("Detecção de natureza", () => {
    it("deve detectar Saída para valores negativos", async () => {
      const csvContent = `descricao,valor
Compra Normal,-100.00`;

      const transactions = await processCSVInvoice(csvContent, "Banco");

      expect(transactions[0].nature).toBe("Saída");
      expect(transactions[0].amount).toBe(100.00); // Valor absoluto
    });
  });
});
