# 🚀 Guia Completo - Como Rodar e Testar

## Pré-requisitos

Antes de começar, você precisa ter instalado:

- ✅ **Node.js 18+** - [Baixar aqui](https://nodejs.org/)
- ✅ **Docker Desktop** - [Baixar aqui](https://www.docker.com/products/docker-desktop/)
- ✅ **Evolution API** - rodando local ou em servidor
- ✅ **Anthropic API Key** - [Obter aqui](https://console.anthropic.com/)

---

## 📦 Passo 1: Instalar Dependências

### Backend
```bash
cd C:\WINDOWS\system32\whatsapp-ai-agents\backend
npm install
```

### Frontend
```bash
cd C:\WINDOWS\system32\whatsapp-ai-agents\frontend
npm install
```

---

## 🗄️ Passo 2: Subir o Banco de Dados

```bash
cd C:\WINDOWS\system32\whatsapp-ai-agents
docker-compose up -d
```

Verifique se está rodando:
```bash
docker ps
```

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

Crie o arquivo `.env` no backend:

```bash
cd backend
copy .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Database (não precisa mudar se usar Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_ai?schema=public"

# JWT Secret (mude para produção)
JWT_SECRET="sua-chave-secreta-aqui"

# Evolution API
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua-evolution-api-key"

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-..."

# Server
PORT=3333
NODE_ENV="development"
```

---

## 🔧 Passo 4: Configurar Prisma

```bash
cd backend

# Gerar o Prisma Client
npm run prisma:generate

# Rodar as migrations (cria as tabelas)
npm run prisma:migrate
```

---

## ▶️ Passo 5: Rodar o Backend

```bash
cd backend
npm run dev
```

Você deve ver:
```
Database connected successfully
🚀 Server running at http://0.0.0.0:3333
📡 Webhook endpoint: http://0.0.0.0:3333/api/webhook
```

---

## 🎨 Passo 6: Rodar o Frontend

Abra **outro terminal**:

```bash
cd frontend
npm install
npm run dev
```

Você deve ver:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Acesse **http://localhost:5173** no navegador!

---

## 🧪 Passo 7: Testar as Funcionalidades

### 1. Criar uma Instância

No frontend, vá em **Instâncias** → **Nova Instância**

Preencha:
- Nome: `Minha Empresa`
- Telefone: `5511999999999`

Depois clique em **QR Code** para conectar.

### 2. Configurar Webhook na Evolution API

No terminal (ou Postman):

```bash
# Primeiro, crie a instância via API
curl -X POST http://localhost:3333/api/instances ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Teste\", \"phoneNumber\": \"5511999999999\"}"
```

Guarde o `apiKey` retornado.

Configure o webhook na Evolution API:
```bash
curl -X POST http://localhost:8080/webhook/set ^
  -H "Content-Type: application/json" ^
  -H "apikey: SUA_EVOLUTION_API_KEY" ^
  -d "{\"instanceId\": \"NOME_DA_INSTANCIA\", \"webhookUrl\": \"http://localhost:3333/api/webhook\"}"
```

### 3. Criar um Agente

Vá em **Agentes** → **Novo Agente**

Preencha:
- **Nome**: `Atendente Virtual`
- **Instância**: Selecione a que criou
- **Personalidade**: Amigável 😊
- **Prompt do Sistema**:
  ```
  Você é um atendente de vendas prestativo.
  Sempre seja educado e tente entender a necessidade do cliente.
  ```
- **Instruções**:
  ```
  1. Cumprimente o cliente pelo nome
  2. Pergunte como pode ajudar
  3. Identifique o produto de interesse
  4. Apresente benefícios
  5. Feche a venda
  ```
- **Intervenção humana**: Ativado

### 4. Criar Disparo em Massa

Vá em **Disparos** → **Novo Disparo**

Preencha:
- **Nome**: `Promoção Teste`
- **Agente**: Selecione o agente criado
- **Telefones**:
  ```
  5511999999999
  5511988888888
  ```
- **Mensagem**: `Olá! Temos uma oferta especial para você...`
- **Delay**: 30 segundos

### 5. Criar Atendentes Humanos

Vá em **Atendentes** → **Novo Atendente**

Preencha:
- **Nome**: `João Silva`
- **Email**: `joao@empresa.com`
- **Telefone**: `5511977777777`

### 6. Testar o Atendimento

1. Envie uma mensagem do WhatsApp para o número da instância
2. A IA deve responder automaticamente
3. No **Dashboard**, veja as métricas atualizando
4. Em **Conversas**, veja a conversa ativa
5. Em **Leads**, veja o lead criado/score atualizado

---

## 🐛 Troubleshooting

### Banco de dados não conecta
```bash
docker-compose down
docker-compose up -d
```

### Porta já em uso
Edite `.env`:
```env
PORT=3334
```

### Evolution API não conecta
Verifique se está rodando:
```bash
docker ps | grep evolution
```

### Prisma error
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

---

## 📊 Testando Cada Funcionalidade

| Funcionalidade | Como Testar |
|---------------|-------------|
| **Agente IA** | Envie mensagem no WhatsApp da instância |
| **Disparos** | Crie disparo e clique em "Iniciar" |
| **Intervenção Humana** | Responda rápido 2x no WhatsApp (IA deve pausar) |
| **Atendente Humano** | Designe lead e mude status para "Ocupado" |
| **Dashboard** | Veja gráficos atualizando em tempo real |
| **Qualificação de Lead** | Converse e mencione interesse de compra |

---

## ✅ Checklist Final

- [ ] Docker rodando (`docker ps`)
- [ ] Backend rodando (http://localhost:3333)
- [ ] Frontend rodando (http://localhost:5173)
- [ ] Banco de dados migrado
- [ ] Instância criada e conectada (QR Code escaneado)
- [ ] Agente criado e ativo
- [ ] Webhook configurado na Evolution API
- [ ] Anthropic API key configurada

---

## 🎯 Comandos Úteis

```bash
# Ver logs do backend
cd backend && npm run dev

# Ver logs do frontend
cd frontend && npm run dev

# Resetar banco de dados
docker-compose down -v
docker-compose up -d
cd backend && npm run prisma:migrate

# Parar tudo
docker-compose down
```

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:
1. Verifique os logs no terminal
2. Confirme as variáveis de ambiente
3. Teste cada serviço separadamente
4. Verifique se as portas não estão em uso
