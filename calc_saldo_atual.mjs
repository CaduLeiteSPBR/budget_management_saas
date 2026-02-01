import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const now = new Date();
const endOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999);

console.log('\n💰 Calculando Saldo Atual (SQL DIRETO):\n');

const result = await db.execute(sql`
  SELECT 
    SUM(CASE WHEN nature = 'Entrada' THEN CAST(amount AS DECIMAL(10,2)) ELSE -CAST(amount AS DECIMAL(10,2)) END) as currentBalance,
    COUNT(CASE WHEN nature = 'Entrada' THEN 1 END) as totalEntradas,
    COUNT(CASE WHEN nature = 'Saída' THEN 1 END) as totalSaidas,
    SUM(CASE WHEN nature = 'Entrada' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as somaEntradas,
    SUM(CASE WHEN nature = 'Saída' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as somaSaidas
  FROM transactions
  WHERE isPaid = 1
  AND date <= ${endOfToday}
`);

const row = result[0][0];

console.log(`📊 Resumo:`);
console.log(`   Total Entradas: ${row.totalEntradas} transações = R$ ${Number(row.somaEntradas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`   Total Saídas: ${row.totalSaidas} transações = R$ ${Number(row.somaSaidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`\n💰 SALDO ATUAL: R$ ${Number(row.currentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`   (até ${new Date(endOfToday).toLocaleString('pt-BR')})\n`);

process.exit(0);
