import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const EMAIL = "caduleitenet@gmail.com";
const PASSWORD = "Cabala99@";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const hash = await bcrypt.hash(PASSWORD, 12);
  console.log("Hash gerado:", hash);

  const conn = await mysql.createConnection(dbUrl);

  // Verificar se usuário existe
  const [rows] = await conn.execute("SELECT id, email FROM users WHERE email = ?", [EMAIL]);
  console.log("Usuário encontrado:", rows);

  if (rows.length === 0) {
    console.error(`Usuário com e-mail ${EMAIL} não encontrado no banco.`);
    await conn.end();
    process.exit(1);
  }

  // Atualizar passwordHash
  const [result] = await conn.execute(
    "UPDATE users SET passwordHash = ? WHERE email = ?",
    [hash, EMAIL]
  );
  console.log("Atualização:", result);
  console.log(`✅ Senha definida com sucesso para ${EMAIL}`);

  await conn.end();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
