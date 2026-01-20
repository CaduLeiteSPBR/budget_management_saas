import { invokeLLM } from "./_core/llm";
import Papa from "papaparse";

export interface ExtractedTransaction {
  description: string;
  amount: number;
  nature: "Entrada" | "Saída";
  suggestedDivision?: string;
  suggestedType?: string;
  suggestedCategoryId?: number;
}

/**
 * Processa arquivo PDF de fatura e extrai transações usando IA
 */
export async function processPDFInvoice(
  fileBuffer: Buffer,
  bankName: string
): Promise<ExtractedTransaction[]> {
  // Converter buffer para base64
  const base64Pdf = fileBuffer.toString('base64');
  const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

  // Usar IA para extrair transações diretamente do PDF
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um assistente especializado em extrair transações de faturas de cartão de crédito.
Analise o PDF da fatura e extraia TODAS as transações encontradas.
Para cada transação, identifique:
- Descrição (limpa e sem caracteres especiais desnecessários)
- Valor (sempre positivo, número decimal)
- Natureza: "Saída" para compras normais, "Entrada" para estornos/créditos

IMPORTANTE: Ignore totais, resumos, taxas de cartão e informações de cabeçalho/rodapé.
Extraia APENAS as transações individuais.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extraia todas as transações desta fatura do banco ${bankName}`,
          },
          {
            type: "file_url",
            file_url: {
              url: dataUrl,
              mime_type: "application/pdf",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "invoice_transactions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number" },
                  nature: { type: "string", enum: ["Entrada", "Saída"] },
                },
                required: ["description", "amount", "nature"],
                additionalProperties: false,
              },
            },
          },
          required: ["transactions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("IA não retornou resposta válida");
  }

  const parsed = JSON.parse(content);
  const transactions: ExtractedTransaction[] = parsed.transactions.map((t: any) => ({
    description: `CC - ${bankName} - ${t.description}`,
    amount: Math.abs(t.amount),
    nature: t.nature as "Entrada" | "Saída",
  }));

  return transactions;
}

/**
 * Processa arquivo CSV de fatura
 */
export async function processCSVInvoice(
  fileContent: string,
  bankName: string
): Promise<ExtractedTransaction[]> {
  return new Promise((resolve, reject) => {
    // Detectar delimitador (vírgula ou ponto e vírgula)
    const delimiter = fileContent.includes(';') ? ';' : ',';
    
    Papa.parse(fileContent, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: ExtractedTransaction[] = results.data.map((row: any) => {
            // Tentar identificar colunas comuns (incluindo formato C6 Bank)
            const description =
              row.descricao ||
              row.Descricao ||
              row["Descrição"] ||
              row.DESCRICAO ||
              row.description ||
              row.Description ||
              row.DESCRIPTION ||
              "";

            const amountStr =
              row.valor ||
              row.Valor ||
              row["Valor (em R$)"] ||
              row["Valor (em US$)"] ||
              row.VALOR ||
              row.amount ||
              row.Amount ||
              row.AMOUNT ||
              "0";

            // Normalizar formato de número (suporta 1.234,56 e 1,234.56)
            let normalizedAmount = String(amountStr).trim();
            
            // Remover espaços e símbolos de moeda
            normalizedAmount = normalizedAmount.replace(/[^\d,.-]/g, "");
            
            // Se tem vírgula e ponto, determinar qual é decimal
            if (normalizedAmount.includes(",") && normalizedAmount.includes(".")) {
              // Se vírgula vem depois do ponto, vírgula é decimal (formato BR: 1.234,56)
              if (normalizedAmount.lastIndexOf(",") > normalizedAmount.lastIndexOf(".")) {
                normalizedAmount = normalizedAmount.replace(/\./g, "").replace(",", ".");
              } else {
                // Ponto é decimal (formato US: 1,234.56)
                normalizedAmount = normalizedAmount.replace(/,/g, "");
              }
            } else if (normalizedAmount.includes(",")) {
              // Só vírgula - assumir que é decimal se tem 2 dígitos depois
              const parts = normalizedAmount.split(",");
              if (parts.length === 2 && parts[1].length <= 2) {
                normalizedAmount = normalizedAmount.replace(",", ".");
              } else {
                normalizedAmount = normalizedAmount.replace(/,/g, "");
              }
            }
            
            const amount = Math.abs(parseFloat(normalizedAmount) || 0);

            // Detectar natureza baseado no sinal, coluna específica ou descrição
            let nature: "Entrada" | "Saída" = "Saída";
            const originalAmount = String(amountStr).trim();
            const descLower = description.toLowerCase();
            
            // Verificar se o valor é negativo (estorno/crédito)
            if (originalAmount.startsWith("-") || parseFloat(originalAmount.replace(/[^\d,.-]/g, "")) < 0) {
              nature = "Entrada"; // Estorno/Crédito
            }
            
            // Verificar palavras-chave de estorno na descrição ou tipo
            if (
              row.tipo?.toLowerCase().includes("estorno") ||
              row.type?.toLowerCase().includes("credit") ||
              descLower.includes("estorno") ||
              descLower.includes("inclusao de pagamento") ||
              descLower.includes("pagamento") ||
              descLower.includes("reembolso") ||
              descLower.includes("crédito")
            ) {
              nature = "Entrada";
            }

            return {
              description: `CC - ${bankName} - ${description}`,
              amount,
              nature,
            };
          });

          resolve(transactions.filter((t) => t.amount > 0 && t.description.length > 0));
        } catch (error) {
          reject(new Error("Erro ao processar CSV: " + error));
        }
      },
      error: (error: any) => {
        reject(new Error("Erro ao parsear CSV: " + error));
      },
    });
  });
}

/**
 * Processa arquivo OFX de fatura
 */
export async function processOFXInvoice(
  fileContent: string,
  bankName: string
): Promise<ExtractedTransaction[]> {
  const transactions: ExtractedTransaction[] = [];

  // Regex simples para extrair transações OFX
  const transactionRegex =
    /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const matchesArray = Array.from(fileContent.matchAll(transactionRegex));

  for (const match of matchesArray) {
    const trxContent = match[1];

    // Extrair campos
    const amountMatch = trxContent.match(/<TRNAMT>([-\d.]+)/);
    const memoMatch = trxContent.match(/<MEMO>([^<]+)/);
    const nameMatch = trxContent.match(/<NAME>([^<]+)/);

    if (amountMatch) {
      const amount = Math.abs(parseFloat(amountMatch[1]));
      const description = memoMatch?.[1] || nameMatch?.[1] || "Transação";
      const nature: "Entrada" | "Saída" =
        parseFloat(amountMatch[1]) < 0 ? "Saída" : "Entrada";

      transactions.push({
        description: `CC - ${bankName} - ${description.trim()}`,
        amount,
        nature,
      });
    }
  }

  return transactions;
}

/**
 * Usa IA para pré-categorizar uma transação
 */
export async function precategorizeTransaction(
  description: string,
  amount: number,
  nature: "Entrada" | "Saída",
  userCategories: any[],
  learningHistory: any[] = []
): Promise<{
  division: string;
  type: string;
  categoryId: number | null;
}> {
  // Buscar padrões similares no histórico de aprendizado
  const descLower = description.toLowerCase();
  const similarLearning = learningHistory.find((l) => {
    const learnedDesc = l.description.toLowerCase();
    // Match exato ou contido
    return learnedDesc.includes(descLower) || descLower.includes(learnedDesc);
  });

  // Se encontrou padrão similar com alta frequência, usar diretamente
  if (similarLearning && similarLearning.frequency >= 2) {
    return {
      division: similarLearning.division || "Pessoal",
      type: similarLearning.type || "Importante",
      categoryId: similarLearning.categoryId || null,
    };
  }

  const categoriesText = userCategories
    .map((c) => `ID ${c.id}: ${c.name} (${c.division} - ${c.type})`)
    .join("\n");

  // Adicionar histórico ao contexto da IA
  const learningContext = learningHistory.length > 0
    ? `\n\nHistórico de categorizações anteriores (use como referência):\n${learningHistory
        .slice(0, 10)
        .map((l) => `"${l.description}" → ${l.division} - ${l.type} - Categoria ID ${l.categoryId || "nenhuma"} (usado ${l.frequency}x)`)
        .join("\n")}`
    : "";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um assistente de categorização financeira.
Analise a transação e sugira a melhor categorização baseado nas categorias disponíveis do usuário.

Divisões possíveis: Pessoal, Familiar, Investimento
Tipos possíveis: Essencial, Importante, Conforto, Investimento

IMPORTANTE: Sempre sugira um categoryId quando houver categoria adequada disponível.${learningContext}`,
      },
      {
        role: "user",
        content: `Transação: ${description}
Valor: R$ ${amount.toFixed(2)}
Natureza: ${nature}

Categorias disponíveis:
${categoriesText}

Sugira a melhor categorização (Divisão, Tipo E Categoria).`,
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
            division: {
              type: "string",
              enum: ["Pessoal", "Familiar", "Investimento"],
            },
            type: {
              type: "string",
              enum: ["Essencial", "Importante", "Conforto", "Investimento"],
            },
            categoryId: { type: ["number", "null"] },
          },
          required: ["division", "type", "categoryId"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    return {
      division: "Pessoal",
      type: "Importante",
      categoryId: null,
    };
  }

  const parsed = JSON.parse(content);
  return {
    division: parsed.division,
    type: parsed.type,
    categoryId: parsed.categoryId,
  };
}
