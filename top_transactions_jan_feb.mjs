import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const startJan = Date.UTC(2026, 0, 1, 0, 0, 0, 0); // 01/01/2026
const endFeb = Date.UTC(2026, 1, 29, 23, 59, 59, 999); // 28/02/2026 (2026 não é bissexto)

console.log('\n📊 5 MAIORES ENTRADAS (Jan/Fev 2026, Pagas):\n');

const entradas = await db.execute(sql`
  SELECT id, description, amount, date, isPaid
  FROM transactions
  WHERE nature = 'Entrada'
  AND isPaid = 1
  AND date >= ${startJan}
  AND date <= ${endFeb}
  ORDER BY CAST(amount AS DECIMAL(10,2)) DESC
  LIMIT 5
`);

entradas[0].forEach((t, index) => {
  console.log(`${index + 1}. ID: ${t.id} - ${t.description}`);
  console.log(`   Valor: R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   Data: ${new Date(t.date).toLocaleDateString('pt-BR')}`);
  console.log('');
});

console.log('\n📊 5 MAIORES SAÍDAS (Jan/Fev 2026, Pagas):\n');

const saidas = await db.execute(sql`
  SELECT id, description, amount, date, isPaid
  FROM transactions
  WHERE nature = 'Saída'
  AND isPaid = 1
  AND date >= ${startJan}
  AND date <= ${endFeb}
  ORDER BY CAST(amount AS DECIMAL(10,2)) DESC
  LIMIT 5
`);

saidas[0].forEach((t, index) => {
  console.log(`${index + 1}. ID: ${t.id} - ${t.description}`);
  console.log(`   Valor: R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   Data: ${new Date(t.date).toLocaleDateString('pt-BR')}`);
  console.log('');
});

process.exit(0);
