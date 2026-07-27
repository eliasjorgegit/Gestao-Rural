const fs = require('fs');
let code = fs.readFileSync('src/db/drizzle.config.ts', 'utf8');

const newCode = `import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER;
const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;

let dbCredentials;

if (databaseUrl) {
  dbCredentials = { url: databaseUrl };
} else {
  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error("DATABASE_URL or SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD must be set in environment variables.");
  }
  dbCredentials = {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true, // Enable verbose output.
});
`;

fs.writeFileSync('src/db/drizzle.config.ts', newCode);
