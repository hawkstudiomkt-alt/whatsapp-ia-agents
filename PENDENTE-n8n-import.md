# Pendente: Importar Workflows no n8n

## O que precisa ser feito

Os 4 workflows abaixo estão prontos em `/n8n-workflows/` e precisam ser importados manualmente no n8n.

## Como importar (2 minutos)

1. Abre o n8n: `https://n8n-n8n.zscidy.easypanel.host`
2. Loga normalmente
3. Abre DevTools: `F12` → aba **Console**
4. Cola e executa o conteúdo de `n8n-workflows/import-all.js`
5. Aguarda: `✅ 4/4 workflows criados com sucesso!`

## Workflows

| Arquivo | Nome | Função |
|---|---|---|
| `01-relatorio-diario.json` | 📊 Relatório Diário | Envia resumo analytics às 8h todo dia via WhatsApp |
| `02-alerta-lead-quente.json` | 🔥 Alerta Lead Quente | Notifica admin quando lead score ≥70 ou vira QUALIFIED |
| `03-followup-automatico.json` | ⏰ Follow-up Automático | Seg-Sáb às 10h e 16h — envia follow-up para leads qualificados inativos >4h |
| `04-captura-leads-externos.json` | 📥 Captura Leads Externos | Webhook para Meta Lead Ads, forms e API externa |

## Variáveis de Ambiente no n8n

Após importar, configurar em **Settings → Variables**:

```
ADMIN_WHATSAPP_NUMBER       = 5511999999999  (número que recebe os alertas)
ADMIN_WHATSAPP_INSTANCE     = whatsapp_01    (nome da instância que envia)
BACKEND_ADMIN_EMAIL         = admin@email.com
BACKEND_ADMIN_PASSWORD      = sua_senha
DEFAULT_INSTANCE_ID         = uuid-da-instancia-padrao
DEFAULT_INSTANCE_NAME       = whatsapp_01
```

## Webhook URLs (após importar, ativar os webhooks)

- **Alerta Lead Quente**: `https://n8n-n8n.zscidy.easypanel.host/webhook/hot-lead-alert`
  → Adicionar no backend: variável `N8N_HOT_LEAD_WEBHOOK_URL`

- **Captura Leads Externos**: `https://n8n-n8n.zscidy.easypanel.host/webhook/capture-lead`
  → Usar para integrar Meta Lead Ads, Google Forms, etc.
