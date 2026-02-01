import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('\n=== CONTAGEM DE TRANSAÇÕES PAGAS ATÉ HOJE ===\n');

const endOfToday = Date.UTC(2026, 1, 1, 23, 59, 59, 999); // 01/02/2026 23:59:59

const result = await db.execute(sql`
  SELECT nature, COUNT(*) as total, SUM(CAST(amount AS DECIMAL(10,2))) as sum_amount
  FROM transactions 
  WHERE isPaid = 1 AND date <= ${endOfToday}
  GROUP BY nature
`);

console.log('Resultado:');
for (const row of result[0]) {
  console.log(`Natureza: ${row.nature}`);
  console.log(`Quantidade: ${row.total}`);
  console.log(`Soma: R$ ${row.sum_amount}`);
  console.log('-'.repeat(50));
}

// Calcular saldo
const entradas = result[0].find(r => r.nature === 'Entrada');
const saidas = result[0].find(r => r.nature === 'Saída');

const totalEntradas = entradas ? parseFloat(entradas.sum_amount) : 0;
const totalSaidas = saidas ? parseFloat(saidas.sum_amount) : 0;
const saldo = totalEntradas - totalSaidas;

console.log('\n=== RESUMO ===');
console.log(`Total Entradas: ${entradas ? entradas.total : 0} transações = R$ ${totalEntradas.toFixed(2)}`);
console.log(`Total Saídas: ${saidas ? saidas.total : 0} transações = R$ ${totalSaidas.toFixed(2)}`);
console.log(`Saldo Atual: R$ ${saldo.toFixed(2)}`);

await connection.end();
