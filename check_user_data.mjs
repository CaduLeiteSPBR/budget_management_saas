import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://26x2gGqtj2qmxT9.dbac34d63271:30dk7Fo0ajZLd8RNAN9f@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/BpLVoFkZmNnvLiHEa2tSFD?ssl={"rejectUnauthorized":true}';

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('👥 Usuários e seus dados:\n');
  
  const [users] = await connection.execute('SELECT id, openId, name, email FROM users');
  
  for (const user of users) {
    console.log(`\n📌 ${user.name} (ID: ${user.id})`);
    console.log(`   OpenID: ${user.openId}`);
    console.log(`   Email: ${user.email}`);
    
    // Contar transações deste usuário
    const [[{ count: txCount }]] = await connection.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE userId = ?',
      [user.id]
    );
    console.log(`   Transações: ${txCount}`);
    
    // Contar cartões deste usuário
    const [[{ count: ccCount }]] = await connection.execute(
      'SELECT COUNT(*) as count FROM credit_cards WHERE userId = ?',
      [user.id]
    );
    console.log(`   Cartões: ${ccCount}`);
    
    // Contar categorias deste usuário
    const [[{ count: catCount }]] = await connection.execute(
      'SELECT COUNT(*) as count FROM categories WHERE userId = ?',
      [user.id]
    );
    console.log(`   Categorias: ${catCount}`);
  }
  
  console.log('\n\n🔑 OWNER_OPEN_ID configurado: FVGmiSxuVMqft5x3UvRAPn');
  
  // Encontrar qual usuário tem esse openId
  const [[ownerUser]] = await connection.execute(
    'SELECT id, name, email FROM users WHERE openId = ?',
    ['FVGmiSxuVMqft5x3UvRAPn']
  );
  
  if (ownerUser) {
    console.log(`✅ Encontrado: ${ownerUser.name} (ID: ${ownerUser.id})`);
  } else {
    console.log('❌ Nenhum usuário com esse openId encontrado');
  }
  
  await connection.end();
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
