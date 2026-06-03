import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://26x2gGqtj2qmxT9.dbac34d63271:30dk7Fo0ajZLd8RNAN9f@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/BpLVoFkZmNnvLiHEa2tSFD?ssl={"rejectUnauthorized":true}';

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('✅ Conectado ao banco de dados\n');
  
  // Verificar tabelas
  const [tables] = await connection.execute("SHOW TABLES");
  console.log('📊 Tabelas encontradas:', tables.map(t => Object.values(t)[0]).join(', '));
  
  // Contar registros em cada tabela
  const tableNames = ['users', 'transactions', 'categories', 'subscriptions', 'installments', 'credit_cards', 'budgets'];
  
  console.log('\n📈 Contagem de registros:\n');
  for (const table of tableNames) {
    try {
      const [[{ count }]] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${count} registros`);
    } catch (e) {
      console.log(`  ${table}: ❌ Tabela não existe ou erro ao contar`);
    }
  }
  
  // Verificar dados específicos
  console.log('\n👥 Usuários:');
  const [users] = await connection.execute('SELECT id, name, email, createdAt FROM users LIMIT 5');
  if (users.length > 0) {
    console.log(users);
  } else {
    console.log('  ❌ Nenhum usuário encontrado');
  }
  
  console.log('\n💳 Últimas transações:');
  const [transactions] = await connection.execute('SELECT id, description, amount, nature, date FROM transactions ORDER BY date DESC LIMIT 5');
  if (transactions.length > 0) {
    console.log(transactions);
  } else {
    console.log('  ❌ Nenhuma transação encontrada');
  }
  
  await connection.end();
  
} catch (error) {
  console.error('❌ Erro ao conectar:', error.message);
  process.exit(1);
}
