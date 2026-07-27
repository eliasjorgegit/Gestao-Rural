# Sistema de Gestão Rural

Sistema completo de Gestão Rural para controle de Propriedades, Talhões, Ciclos Produtivos, Atividades Agrícolas, Custos, Colheitas e Estoque, com relatórios financeiros e exportação de dados (Excel e JSON).

---

## 🛠️ Modos de Autenticação

1. **Cadastro e Login por E-mail e Senha (Local / Próprio)**:
   - Funciona de forma 100% autônoma via banco de dados PostgreSQL e tokens JWT.
   - Não depende de serviços externos para autenticar usuários.
   - Ideal para execução em `localhost` ou em servidores próprios.

2. **Entrar com o Google**:
   - Integração pronta com Google OAuth / Firebase Auth.
   - Sincroniza automaticamente o usuário com a tabela `users` do PostgreSQL.

---

## 💻 Como Executar no Localhost (Na sua máquina)

### Pré-requisitos
- **Node.js** v18 ou superior instalado.
- **PostgreSQL** (versão 12 ou superior) rodando localmente ou em contêiner Docker.

### Passo 1: Clonar o projeto e instalar as dependências
```bash
# Entre na pasta do projeto
cd gestao-rural

# Instale os pacotes npm
npm install
```

### Passo 2: Configurar o Banco de Dados PostgreSQL
Crie um banco de dados no seu PostgreSQL local chamado `gestao_rural`:
```sql
CREATE DATABASE gestao_rural;
```

### Passo 3: Configurar as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (copiando o modelo `.env.example`):
```env
APP_URL="http://localhost:3000"
JWT_SECRET="sua_chave_secreta_jwt_local_2026"

# URL de conexão com o PostgreSQL local
DATABASE_URL="postgresql://postgres:suasenha@localhost:5432/gestao_rural"
```

### Passo 4: Criar as Tabelas no Banco de Dados
Execute a migração do Drizzle para criar todas as tabelas no PostgreSQL local:
```bash
npx drizzle-kit push
```

### Passo 5: Iniciar a Aplicação em Desenvolvimento
```bash
npm run dev
```
Acesse no seu navegador: **http://localhost:3000**

---

## ☁️ Como Executar Online / Hospedagem na Nuvem

Você pode hospedar o sistema em qualquer provedor Cloud (Cloud Run, Docker, Render, Railway, Fly.io, Vercel ou VPS Ubuntu/Debian).

### 1. Banco de Dados PostgreSQL na Nuvem
Utilize um serviço gerenciado de PostgreSQL como:
- **Supabase** (Gratuito)
- **Neon.tech** (Gratuito)
- **Google Cloud SQL**
- **AWS RDS**

Obtenha a URL da string de conexão (Exemplo: `postgresql://user:pass@ep-cool-site.us-east-1.aws.neon.tech/gestao_rural?sslmode=require`).

### 2. Variáveis de Ambiente na Nuvem
No painel da sua hospedagem, configure as seguintes variáveis:
- `DATABASE_URL`: A URL do seu banco de dados na nuvem.
- `JWT_SECRET`: Uma chave secreta e aleatória para assinatura das sessões.
- `NODE_ENV`: `production`

### 3. Build e Execução de Produção
Para compilar e rodar a aplicação em ambiente de produção:
```bash
# Compilar o frontend e o servidor backend
npm run build

# Iniciar o servidor de produção
npm start
```

---

## 📂 Estrutura do Projeto

- `/src/components/` - Módulos de interface (Propriedades, Talhões, Ciclos, Custos, Colheitas, Relatórios, Estoque).
- `/src/context/AuthContext.tsx` - Gerenciamento de sessão unificado (E-mail/Senha + Google).
- `/src/db/` - Esquemas de tabelas Drizzle ORM e conexão PostgreSQL (`schema.ts`).
- `/server.ts` - Servidor backend Express + Vite middleware, rotas de autenticação `/api/auth/*` e endpoints de dados.
