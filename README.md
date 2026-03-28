# WhatsApp AI Agents

Sistema de automação de atendimento WhatsApp com agentes de IA.

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Evolution  │────▶│   Backend    │────▶│  Anthropic  │
│    API      │     │  (Fastify)   │     │    API      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    └──────────────┘
```

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Evolution API rodando (local ou remoto)
- Anthropic API Key

## Instalação

### 1. Subir banco de dados

```bash
cd whatsapp-ai-agents
docker-compose up -d
```

### 2. Instalar dependências do backend

```bash
cd backend
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 4. Gerar Prisma Client e rodar migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Rodar o backend

```bash
npm run dev
```

O servidor rodará em `http://localhost:3333`

### 6. Instalar e rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend rodará em `http://localhost:5173`

## API Endpoints

### Instâncias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/instances` | Criar instância |
| GET | `/api/instances` | Listar instâncias |
| GET | `/api/instances/:id` | Buscar instância |
| PUT | `/api/instances/:id` | Atualizar instância |
| DELETE | `/api/instances/:id` | Deletar instância |
| POST | `/api/instances/:id/qr` | Gerar QR Code |

### Agentes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/agents` | Criar agente |
| GET | `/api/agents` | Listar agentes |
| GET | `/api/agents/:id` | Buscar agente |
| PUT | `/api/agents/:id` | Atualizar agente |
| DELETE | `/api/agents/:id` | Deletar agente |

### Leads

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/leads` | Listar leads |
| GET | `/api/leads/:id` | Buscar lead |
| PUT | `/api/leads/:id` | Atualizar lead |
| PATCH | `/api/leads/:id/status` | Atualizar status |

### Analytics

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/analytics/summary` | Resumo geral |
| GET | `/api/analytics/daily` | Analytics diário |
| GET | `/api/analytics/dashboard` | Dashboard completo |

### Webhook

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/webhook/:apiKey` | Webhook Evolution API |

### Atendentes Humanos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/human-attendees` | Criar atendente |
| GET | `/api/human-attendees` | Listar atendentes |
| PATCH | `/api/human-attendees/:id/status` | Atualizar status |
| POST | `/api/human-attendees/assign` | Designar conversa |
| GET | `/api/human-attendees/:attendeeId/assignments` | Ver designações |

### Disparos em Massa

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/discharges` | Criar disparo |
| GET | `/api/discharges` | Listar disparos |
| POST | `/api/discharges/:id/start` | Iniciar disparo |
| POST | `/api/discharges/:id/cancel` | Cancelar disparo |

## Configurando Evolution API

1. Crie uma instância no sistema:
```bash
curl -X POST http://localhost:3333/api/instances \
  -H "Content-Type: application/json" \
  -d '{"name": "Minha Instância", "phoneNumber": "5511999999999"}'
```

2. Gere o QR Code:
```bash
curl -X POST http://localhost:3333/api/instances/{id}/qr
```

3. Configure o webhook na Evolution API:
```
URL: http://seu-servidor:3333/api/webhook
API Key: {apiKey_retornada_na_criacao}
Events: messages.upsert
```

## Estrutura do Projeto

```
whatsapp-ai-agents/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações (DB, Anthropic, Evolution)
│   │   ├── controllers/     # Controllers HTTP
│   │   ├── services/        # Regras de negócio
│   │   │   ├── ai.service.ts
│   │   │   ├── agent.service.ts
│   │   │   ├── conversation.service.ts
│   │   │   ├── discharge.service.ts
│   │   │   ├── human-attendee.service.ts
│   │   │   ├── instance.service.ts
│   │   │   ├── lead.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── analytics.service.ts
│   │   ├── routes/          # Definição de rotas
│   │   ├── types/           # Tipos TypeScript
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Modelagem do banco
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Instances.tsx
│   │   │   ├── Agents.tsx
│   │   │   ├── Conversations.tsx
│   │   │   ├── Leads.tsx
│   │   │   ├── HumanAttendees.tsx
│   │   │   └── Discharges.tsx
│   │   ├── components/
│   │   │   └── ui.tsx       # Componentes UI modernos
│   │   ├── lib/
│   │   │   └── api.ts       # API client
│   │   └── App.tsx
│   └── package.json
└── docker-compose.yml
```

## Fluxo de Atendimento

1. Mensagem chega via webhook da Evolution API
2. Sistema identifica/cria conversa
3. Busca histórico e informações do lead
4. IA gera resposta baseada nas instruções do agente
5. Resposta é enviada via Evolution API
6. Analytics são atualizados

## Funcionalidades Implementadas

- [x] Backend com Fastify + TypeScript
- [x] Modelagem de dados com Prisma + PostgreSQL
- [x] Integração com Evolution API (WhatsApp)
- [x] Integração com Anthropic API (IA)
- [x] Agentes com prompts personalizáveis
- [x] Qualificação automática de leads
- [x] Dashboard frontend (React + Tailwind)
- [x] Monitoramento de métricas em tempo real
- [ ] Autenticação JWT
- [ ] Filas com Redis
- [ ] Suporte a mídia (imagens, áudio)
- [ ] Templates de mensagens
