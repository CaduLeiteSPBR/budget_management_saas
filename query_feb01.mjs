import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
// import * as schema from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('\n=== TRANSAÇÕES DO DIA 01/02/2026 ===\n');

// Query para transações do dia 01/02/2026
const startDate = Date.UTC(2026, 1, 1, 0, 0, 0, 0); // 01/02/2026 00:00:00
const endDate = Date.UTC(2026, 1, 1, 23, 59, 59, 999); // 01/02/2026 23:59:59

const transactions = await db.execute(sql`
  SELECT id, description, amount, nature, isPaid, date, FROM_UNIXTIME(date/1000) as date_readable
  FROM transactions 
  WHERE date >= ${startDate} AND date <= ${endDate}
  ORDER BY amount DESC
`);

console.log(`Total encontrado: ${transactions[0].length}\n`);

let totalEntradas = 0;
let totalSaidas = 0;
let saldoInicial = null;

for (const row of transactions[0]) {
  console.log(`ID: ${row.id}`);
  console.log(`Descrição: ${row.description}`);
  console.log(`Valor: R$ ${row.amount}`);
  console.log(`Natureza: ${row.nature}`);
  console.log(`Pago: ${row.isPaid ? 'Sim' : 'Não'}`);
  console.log(`Data: ${row.date_readable}`);
  console.log('-'.repeat(50));
  
  if (row.description.toLowerCase().includes('saldo inicial')) {
    saldoInicial = { id: row.id, amount: parseFloat(row.amount), nature: row.nature };
  }
  
  if (row.isPaid) {
    if (row.nature === 'Entrada') {
      totalEntradas += parseFloat(row.amount);
    } else {
      totalSaidas += parseFloat(row.amount);
    }
  }
}

console.log('\n=== RESUMO ===');
console.log(`Total Entradas (pagas): R$ ${totalEntradas.toFixed(2)}`);
console.log(`Total Saídas (pagas): R$ ${totalSaidas.toFixed(2)}`);
console.log(`Saldo do dia: R$ ${(totalEntradas - totalSaidas).toFixed(2)}`);

if (saldoInicial) {
  console.log(`\n=== SALDO INICIAL ENCONTRADO ===`);
  console.log(`ID: ${saldoInicial.id}`);
  console.log(`Valor: R$ ${saldoInicial.amount.toFixed(2)}`);
  console.log(`Natureza: ${saldoInicial.nature}`);
} else {
  console.log(`\n⚠️ SALDO INICIAL NÃO ENCONTRADO NO DIA 01/02/2026`);
}

await connection.end();
