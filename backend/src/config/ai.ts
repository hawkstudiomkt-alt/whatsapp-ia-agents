/**
 * Configuração da IA — Claude Haiku via Anthropic API
 *
 * O agente IA agora é chamado diretamente pelo backend (webhook.controller.ts)
 * sem passar pelo n8n. Isso reduz latência e custos de tokens.
 *
 * Modelo: claude-haiku-4-5-20251001 (mais barato, rápido, ideal para atendimento)
 * Tokens por resposta: máx 300 (configurável em ai.service.ts)
 * Histórico: últimas 10 mensagens (configurável em ai.service.ts)
 *
 * Variável de ambiente necessária: ANTHROPIC_API_KEY
 */

export const AI_CONFIG = {
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 300,
  maxHistoryMessages: 10,
  apiUrl: 'https://api.anthropic.com/v1/messages',
  anthropicVersion: '2023-06-01',
};
