import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

console.log('\n📋 Saldos Iniciais PAGOS no banco:\n');

const result = await db.execute(sql`
  SELECT id, description, amount, nature, date, isPaid
  FROM transactions
  WHERE description LIKE '%Saldo Inicial%'
  AND isPaid = 1
  ORDER BY date ASC
`);

const transactions = result[0];

console.log(`Total: ${transactions.length} Saldos Iniciais pagos\n`);

let somaTotal = 0;

transactions.forEach((t, index) => {
  const valor = Number(t.amount);
  somaTotal += t.nature === "Entrada" ? valor : -valor;
  
  console.log(`${index + 1}. ID: ${t.id}`);
  console.log(`   Descrição: ${t.description}`);
  console.log(`   Valor: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   Natureza: ${t.nature}`);
  console.log(`   Data: ${new Date(t.date).toLocaleDateString('pt-BR')}`);
  console.log('');
});

console.log(`💰 SOMA TOTAL DOS SALDOS INICIAIS: R$ ${somaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);

process.exit(0);
