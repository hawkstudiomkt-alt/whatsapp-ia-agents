import { prisma } from '../config/database';
import { MessageDirection } from '@prisma/client';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 350;   // Respostas curtas → menos custo

// Modelos Claude válidos (mapeamento de IDs antigos/legados)
const MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5-20251001':        'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6':                'claude-sonnet-4-6',
  'claude-opus-4-6':                  'claude-opus-4-6',
  // Legados (OpenRouter) → Haiku
  'anthropic/claude-3-haiku':         'claude-haiku-4-5-20251001',
  'anthropic/claude-3-5-sonnet':      'claude-sonnet-4-6',
  'openai/gpt-4o-mini':               'claude-haiku-4-5-20251001',
  'openai/gpt-4o':                    'claude-sonnet-4-6',
};

function resolveModel(aiModel?: string | null): string {
  if (!aiModel) return DEFAULT_MODEL;
  return MODEL_MAP[aiModel] || DEFAULT_MODEL;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProcessMessageInput {
  conversationId: string;
  instanceId: string;
  leadId: string;
  phoneNumber: string;
  pushName?: string;
  content: string;
  agentSystemPrompt: string;
  agentName: string;
  agentModel?: string | null;   // modelo configurado no agente
  agentHistoryLimit?: number;   // histórico configurado no agente
  leadStatus: string;
  leadName: string | null;
  leadScore: number;
  isHumanHandling: boolean;
}

/**
 * Monta o system prompt compacto baseado no status do lead.
 * Prompt curto = menos tokens de input.
 */
function buildSystemPrompt(
  agentSystemPrompt: string,
  leadStatus: string,
  leadName: string | null,
  leadScore: number
): string {
  const name = leadName || 'o cliente';

  let roleContext = '';
  if (leadStatus === 'CONVERTED') {
    roleContext = `Você está atendendo ${name} em suporte pós-venda. Seja prestativo e resolva dúvidas de quem já é cliente. Não tente vender novamente.`;
  } else {
    // NEW ou QUALIFIED
    roleContext = `Você está conversando com ${name} (score: ${leadScore}/100). Qualifique o interesse, entenda a necessidade e guie para conversão. Seja direto e amigável.`;
  }

  return `${agentSystemPrompt}\n\n${roleContext}\n\nRegras: respostas curtas (máx 3 parágrafos), em português, sem asteriscos excessivos. Nunca mencione que é uma IA a menos que perguntado diretamente.`;
}

/**
 * Busca histórico da conversa e converte para formato Anthropic.
 * Limita ao historyLimit configurado no agente para economizar tokens.
 */
async function buildHistory(conversationId: string, limit: number): Promise<AnthropicMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { content: true, direction: true },
  });

  // Reverte para ordem cronológica
  return messages
    .reverse()
    .map(m => ({
      role: m.direction === MessageDirection.INBOUND ? 'user' : 'assistant',
      content: m.content,
    }));
}

/**
 * Chama a API da Anthropic via fetch nativo.
 * Suporta qualquer modelo Claude configurado no agente.
 */
async function callClaude(
  model: string,
  systemPrompt: string,
  messages: AnthropicMessage[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-anthropic-api-key') {
    throw new Error('ANTHROPIC_API_KEY não configurada — adicione a chave no painel do EasyPanel');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const text = data.content.find(c => c.type === 'text')?.text;
  if (!text) throw new Error('Resposta vazia da Anthropic');

  // Log de uso de tokens para monitoramento de custo
  if (data.usage) {
    console.log(`[ai] Tokens — input: ${data.usage.input_tokens} | output: ${data.usage.output_tokens} | modelo: ${model}`);
  }

  return text.trim();
}

export const aiService = {
  /**
   * Processa uma mensagem do lead e gera resposta via Claude.
   * Retorna null se o AI não deve responder (DISQUALIFIED, humano, etc.)
   */
  async processMessage(input: ProcessMessageInput): Promise<string | null> {
    const {
      conversationId,
      agentSystemPrompt,
      agentModel,
      agentHistoryLimit = 10,
      leadStatus,
      leadName,
      leadScore,
      isHumanHandling,
      content,
    } = input;

    // Não responde se humano está atendendo
    if (isHumanHandling) {
      console.log('[ai] Conversa em atendimento humano — AI pausada');
      return null;
    }

    // Não responde para leads desqualificados
    if (leadStatus === 'DISQUALIFIED') {
      console.log('[ai] Lead DISQUALIFIED — AI pausada');
      return null;
    }

    const model = resolveModel(agentModel);
    const historyLimit = Math.max(4, Math.min(agentHistoryLimit, 20)); // entre 4 e 20

    // Monta system prompt compacto
    const systemPrompt = buildSystemPrompt(agentSystemPrompt, leadStatus, leadName, leadScore);

    // Busca histórico
    const history = await buildHistory(conversationId, historyLimit);

    // Garante que a mensagem atual está no final
    const lastMsg = history[history.length - 1];
    if (!lastMsg || lastMsg.content !== content || lastMsg.role !== 'user') {
      history.push({ role: 'user', content });
    }

    const reply = await callClaude(model, systemPrompt, history);

    console.log(`[ai] ${model} respondeu (${reply.length} chars) para conv ${conversationId}`);
    return reply;
  },
};
