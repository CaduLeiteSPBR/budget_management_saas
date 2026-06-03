import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = 'mysql://26x2gGqtj2qmxT9.dbac34d63271:30dk7Fo0ajZLd8RNAN9f@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/BpLVoFkZmNnvLiHEa2tSFD?ssl={"rejectUnauthorized":true}';

const backup = {};

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('📦 Iniciando backup completo...\n');
  
  const tables = ['users', 'transactions', 'categories', 'subscriptions', 'installments', 'credit_cards', 'budgets', 'ai_learning', 'dashboard_preferences', 'subscription_history'];
  
  for (const table of tables) {
    try {
      const [rows] = await connection.execute(`SELECT * FROM ${table}`);
      backup[table] = rows;
      console.log(`✅ ${table}: ${rows.length} registros`);
    } catch (e) {
      console.log(`⚠️  ${table}: erro ao exportar`);
    }
  }
  
  // Salvar em JSON
  const backupPath = '/home/ubuntu/BACKUP_DADOS_COMPLETO.json';
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\n✅ Backup salvo em: ${backupPath}`);
  
  // Criar resumo
  const summary = {};
  for (const [table, rows] of Object.entries(backup)) {
    summary[table] = rows.length;
  }
  console.log('\n📊 Resumo:');
  console.log(JSON.stringify(summary, null, 2));
  
  await connection.end();
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
