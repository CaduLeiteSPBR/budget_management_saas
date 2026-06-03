import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://26x2gGqtj2qmxT9.dbac34d63271:30dk7Fo0ajZLd8RNAN9f@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/BpLVoFkZmNnvLiHEa2tSFD?ssl={"rejectUnauthorized":true}';

const FROM_USER_ID = 1;  // Usuário com dados
const TO_USER_ID = 11220001;  // Usuário vazio (OWNER_OPEN_ID)

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log(`🔄 Migrando dados de usuário ${FROM_USER_ID} para ${TO_USER_ID}...\n`);
  
  // Listar tabelas que precisam migração
  const tables = [
    'transactions',
    'categories',
    'subscriptions',
    'subscription_history',
    'credit_cards',
    'budgets',
    'ai_learning',
    'dashboard_preferences'
  ];
  
  for (const table of tables) {
    try {
      const [[{ count }]] = await connection.execute(
        `SELECT COUNT(*) as count FROM ${table} WHERE userId = ?`,
        [FROM_USER_ID]
      );
      
      if (count > 0) {
        // Atualizar userId
        await connection.execute(
          `UPDATE ${table} SET userId = ? WHERE userId = ?`,
          [TO_USER_ID, FROM_USER_ID]
        );
        console.log(`✅ ${table}: ${count} registros migrados`);
      } else {
        console.log(`⏭️  ${table}: 0 registros`);
      }
    } catch (e) {
      console.log(`⚠️  ${table}: erro ao migrar`);
    }
  }
  
  console.log('\n✅ Migração concluída!');
  
  // Verificar resultado
  console.log('\n📊 Verificação final:');
  const [newUserData] = await connection.execute(
    'SELECT id, name FROM users WHERE id = ?',
    [TO_USER_ID]
  );
  
  if (newUserData.length > 0) {
    const user = newUserData[0];
    console.log(`\n👤 ${user.name} (ID: ${user.id})`);
    
    const [[{ txCount }]] = await connection.execute(
      'SELECT COUNT(*) as txCount FROM transactions WHERE userId = ?',
      [TO_USER_ID]
    );
    console.log(`   Transações: ${txCount}`);
    
    const [[{ ccCount }]] = await connection.execute(
      'SELECT COUNT(*) as ccCount FROM credit_cards WHERE userId = ?',
      [TO_USER_ID]
    );
    console.log(`   Cartões: ${ccCount}`);
    
    const [[{ catCount }]] = await connection.execute(
      'SELECT COUNT(*) as catCount FROM categories WHERE userId = ?',
      [TO_USER_ID]
    );
    console.log(`   Categorias: ${catCount}`);
  }
  
  await connection.end();
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
