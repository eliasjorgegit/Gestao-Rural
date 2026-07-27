const fs = require('fs');

const envExample = `# Configurações do Banco de Dados PostgreSQL
# Se você tiver a URL de conexão direta completa, use DATABASE_URL.
# Exemplo: postgresql://usuario:senha@localhost:5432/gestao_rural
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestao_rural"

# Caso contrário, você pode usar as variáveis separadas abaixo. O sistema tentará usar o DATABASE_URL primeiro, se existir.
SQL_HOST="localhost"
SQL_PORT="5432"
SQL_DB_NAME="gestao_rural"
SQL_USER="postgres"
SQL_PASSWORD="password"

# Secret para assinatura dos Tokens JWT do Login Local (E-mail e Senha)
JWT_SECRET="seu-secret-jwt-aqui-2026"

# APP_URL: URL base da aplicação
APP_URL="http://localhost:3000"

# GEMINI_API_KEY: Requerido para integrações com Gemini AI (se aplicável).
GEMINI_API_KEY=""
`;

fs.writeFileSync('.env.example', envExample);
