import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const startJan = Date.UTC(2026, 0, 1, 0, 0, 0, 0); // 01/01/2026 00:00:00 UTC
const endJan = Date.UTC(2026, 0, 31, 23, 59, 59, 999); // 31/01/2026 23:59:59 UTC

console.log('\n🔍 Lançamentos de JANEIRO > R$ 5.000 (exceto Saldo Inicial):\n');

const result = await db.execute(sql`
  SELECT id, description, amount, nature, date, isPaid
  FROM transactions
  WHERE date >= ${startJan}
  AND date <= ${endJan}
  AND CAST(amount AS DECIMAL(10,2)) > 5000
  AND description NOT LIKE '%Saldo Inicial%'
  ORDER BY CAST(amount AS DECIMAL(10,2)) DESC
`);

const transactions = result[0];

if (transactions.length === 0) {
  console.log('✅ Nenhum lançamento suspeito encontrado!');
} else {
  console.log(`Total: ${transactions.length} lançamentos\n`);
  
  transactions.forEach((t, index) => {
    console.log(`${index + 1}. ID: ${t.id}`);
    console.log(`   Descrição: ${t.description}`);
    console.log(`   Valor: R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   Natureza: ${t.nature}`);
    console.log(`   Data: ${new Date(t.date).toLocaleDateString('pt-BR')}`);
    console.log(`   Pago: ${t.isPaid ? 'Sim' : 'Não'}`);
    console.log('');
  });
}

process.exit(0);
