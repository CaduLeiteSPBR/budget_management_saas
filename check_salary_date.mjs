import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

console.log('\n🔍 Verificando data do Salário 2/12 (ID 30002):\n');

const result = await db.execute(sql`
  SELECT id, description, amount, date
  FROM transactions
  WHERE id = 30002
`);

const transaction = result[0][0];

if (transaction) {
  const date = new Date(transaction.date);
  console.log(`ID: ${transaction.id}`);
  console.log(`Descrição: ${transaction.description}`);
  console.log(`Valor: R$ ${Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Data (timestamp): ${transaction.date}`);
  console.log(`Data (legível): ${date.toLocaleString('pt-BR')}`);
  console.log(`Data (UTC): ${date.toUTCString()}`);
  
  // Verificar se está em Janeiro ou Fevereiro
  const month = date.getUTCMonth() + 1; // 1 = Jan, 2 = Fev
  const year = date.getUTCFullYear();
  
  console.log(`\n📅 Mês: ${month}/${year}`);
  
  if (month === 1) {
    console.log('⚠️ ATENÇÃO: Salário 2/12 está em JANEIRO! Deve ser movido para 01/02/2026.');
  } else if (month === 2) {
    console.log('✅ OK: Salário 2/12 está em FEVEREIRO.');
  }
} else {
  console.log('❌ ID 30002 não encontrado!');
}

process.exit(0);
