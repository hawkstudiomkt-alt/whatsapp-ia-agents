import { prisma } from '../config/database';
import { MessageDirection } from '@prisma/client';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 500; // Ligeiramente maior para acomodar o JSON + msgs

// Modelos Claude válidos (mapeamento de IDs antigos/legados)
const MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5-20251001':   'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6':           'claude-sonnet-4-6',
  'claude-opus-4-6':             'claude-opus-4-6',
  // Legados → Haiku
  'anthropic/claude-3-haiku':    'claude-haiku-4-5-20251001',
  'anthropic/claude-3-5-sonnet': 'claude-sonnet-4-6',
  'openai/gpt-4o-mini':          'claude-haiku-4-5-20251001',
  'openai/gpt-4o':               'claude-sonnet-4-6',
};

function resolveModel(aiModel?: string | null): string {
  if (!aiModel) return DEFAULT_MODEL;
  return MODEL_MAP[aiModel] || DEFAULT_MODEL;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  messages: string[];          // Balões a enviar (picotado)
  newLeadStatus?: string;      // Ex: 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'
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
  agentModel?: string | null;
  agentHistoryLimit?: number;
  leadStatus: string;
  leadName: string | null;
  leadScore: number;
  isHumanHandling: boolean;
}

/**
 * Instrução de formato de saída JSON — adicionada ao final de todo system prompt.
 * Haiku é bom em seguir formatos simples quando a instrução é clara.
 */
const OUTPUT_FORMAT = `
## FORMATO DE RESPOSTA (OBRIGATÓRIO)
Sempre responda APENAS com JSON válido, sem texto fora do JSON:
{"msgs":["balão1","balão2"],"status":"NOVO_STATUS"}

Regras:
- "msgs": array de 1 a 3 strings, cada uma com máx 120 caracteres
- "status": opcional, use APENAS se o status do lead mudar:
  - "QUALIFIED" → lead demonstrou interesse real
  - "CONVERTED" → lead confirmou compra/pagamento
  - "DISQUALIFIED" → lead disse explicitamente que não quer
- Se não mudar o status, omita o campo "status"
- NUNCA coloque texto fora do JSON`;

/**
 * Monta system prompt com contexto do lead e instrução de formato.
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
    roleContext = `\n\n## CONTEXTO DO LEAD\n${name} já é cliente confirmado. Foque em suporte pós-venda. Não tente vender novamente.`;
  } else if (leadStatus === 'QUALIFIED') {
    roleContext = `\n\n## CONTEXTO DO LEAD\n${name} já demonstrou interesse (score: ${leadScore}/100). Conduza para conversão.`;
  } else {
    roleContext = `\n\n## CONTEXTO DO LEAD\n${name} é um novo contato (score: ${leadScore}/100). Qualifique o interesse com naturalidade.`;
  }

  return agentSystemPrompt + roleContext + OUTPUT_FORMAT;
}

/**
 * Busca histórico da conversa e converte para formato Anthropic.
 */
async function buildHistory(conversationId: string, limit: number): Promise<AnthropicMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { content: true, direction: true },
  });

  return messages
    .reverse()
    .map(m => ({
      role: m.direction === MessageDirection.INBOUND ? 'user' : 'assistant',
      content: m.content,
    }));
}

/**
 * Chama Anthropic API e parseia a resposta JSON estruturada.
 */
async function callClaude(
  model: string,
  systemPrompt: string,
  messages: AnthropicMessage[]
): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-anthropic-api-key') {
    throw new Error('ANTHROPIC_API_KEY não configurada');
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

  if (data.usage) {
    console.log(`[ai] Tokens — input: ${data.usage.input_tokens} | output: ${data.usage.output_tokens} | modelo: ${model}`);
  }

  const raw = data.content.find(c => c.type === 'text')?.text?.trim() || '';

  // Tenta parsear JSON estruturado
  try {
    // Remove markdown code blocks se houver
    const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean) as { msgs?: string[]; status?: string };

    const msgs = Array.isArray(parsed.msgs) && parsed.msgs.length > 0
      ? parsed.msgs.map((m: string) => String(m).trim()).filter(Boolean)
      : [raw]; // fallback: usa o texto bruto

    return {
      messages: msgs.slice(0, 3), // máx 3 balões
      newLeadStatus: parsed.status || undefined,
    };
  } catch {
    // Fallback se Claude não retornar JSON válido: split por \n\n
    console.warn('[ai] Resposta não é JSON válido, usando fallback de split');
    const msgs = raw
      .split(/\n\n+/)
      .map((m: string) => m.trim())
      .filter(Boolean)
      .slice(0, 3);

    return { messages: msgs.length > 0 ? msgs : [raw] };
  }
}

export const aiService = {
  /**
   * Processa mensagem do lead e retorna balões picotados + novo status se mudar.
   * Retorna null se o AI não deve responder.
   */
  async processMessage(input: ProcessMessageInput): Promise<AIResponse | null> {
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

    if (isHumanHandling) {
      console.log('[ai] Conversa em atendimento humano — AI pausada');
      return null;
    }

    if (leadStatus === 'DISQUALIFIED') {
      console.log('[ai] Lead DISQUALIFIED — AI pausada');
      return null;
    }

    const model = resolveModel(agentModel);
    const historyLimit = Math.max(4, Math.min(agentHistoryLimit, 20));

    const systemPrompt = buildSystemPrompt(agentSystemPrompt, leadStatus, leadName, leadScore);
    const history = await buildHistory(conversationId, historyLimit);

    // Garante que a mensagem atual está no final
    const lastMsg = history[history.length - 1];
    if (!lastMsg || lastMsg.content !== content || lastMsg.role !== 'user') {
      history.push({ role: 'user', content });
    }

    const result = await callClaude(model, systemPrompt, history);

    console.log(`[ai] ${model} → ${result.messages.length} balão(s) | status: ${result.newLeadStatus || 'sem mudança'}`);
    return result;
  },
};
