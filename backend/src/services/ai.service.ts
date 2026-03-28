import { openRouter } from '../config/ai';
import { prisma } from '../config/database';
import { MessageContext, AgentContext, LeadContext } from '../types';
import { googleCalendarService } from './google-calendar.service';
import { notionService } from './notion.service';
import { integrationService } from './integration.service';

interface GenerateResponseParams {
  agentId: string;
  instanceId: string;
  userMessage: string;
  conversationHistory: MessageContext[];
  lead?: LeadContext;
  isHumanHandling?: boolean;
}

interface AIResponse {
  text: string;
  shouldTransfer?: boolean;
  leadUpdate?: {
    name?: string;
    email?: string;
    score?: number;
    status?: string;
    notes?: string;
  };
}

export const aiService = {
  async generateResponse(params: GenerateResponseParams): Promise<AIResponse> {
    const { agentId, instanceId, userMessage, conversationHistory, lead, isHumanHandling } = params;

    // Se humano está atendendo, não gera resposta
    if (isHumanHandling) {
      return { text: '', shouldTransfer: false };
    }

    // Busca informações do agente
    const agent = await (prisma.agent as any).findUnique({
      where: { id: agentId },
      select: {
        name: true,
        instructions: true,
        systemPrompt: true,
        tone: true,
        language: true,
        humanInterventionEnabled: true,
        aiModel: true,
        guardrails: true,
      },
    });

    if (!agent) {
      throw new Error('Agente não encontrado');
    }

    // Constrói o prompt do sistema
    const systemPrompt = this.buildSystemPrompt(
      agent.systemPrompt, 
      agent.instructions, 
      lead, 
      agent.tone, 
      agent.language, 
      agent.guardrails
    );

    // Constrói o histórico da conversa
    const conversationMessages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Busca integrações ativas para esta instância
    const integrations = await integrationService.findByInstance(instanceId);
    const hasGoogle = integrations.some(i => i.type === 'GOOGLE_CALENDAR' && i.isActive);
    const hasNotion = integrations.some(i => i.type === 'NOTION' && i.isActive);

    const tools: any[] = [];
    if (hasGoogle) {
      tools.push({
        type: 'function',
        function: {
          name: 'list_available_times',
          description: 'Lista horários ou eventos na agenda do cliente para um período (formato ISO).',
          parameters: {
            type: 'object',
            properties: {
              timeMin: { type: 'string' },
              timeMax: { type: 'string' },
            },
            required: ['timeMin', 'timeMax'],
          },
        },
      });
      tools.push({
        type: 'function',
        function: {
          name: 'schedule_appointment',
          description: 'Agenda um compromisso na agenda do cliente.',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['summary', 'startTime', 'endTime'],
          },
        },
      });
    }

    if (hasNotion) {
      tools.push({
        type: 'function',
        function: {
          name: 'sync_to_crm',
          description: 'Sincroniza os dados do lead para o CRM/Notion.',
          parameters: { type: 'object', properties: {} },
        },
      });
    }

    const extractionInstruction = `
<instrucoes_extracao>
IMPORTANT: Use as instruções específicas do agente acima para identificar quais dados são cruciais coletar neste estágio da conversa.
Sempre que o cliente fornecer uma informação nova e relevante (conforme definido nas instruções do agente), extraia-a no JSON abaixo.

Retorne EXCLUSIVAMENTE o JSON final no formato:
<lead_update>
{"name": "...", "email": "...", "score": 0-100, "status": "NEW|QUALIFIED|DISQUALIFIED|CONVERTED", "notes": "Resumo das informações relevantes coletadas nesta interação..."}
</lead_update>
</instrucoes_extracao>
`;

    let response = await openRouter.chat.completions.create({
      model: agent.aiModel || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + extractionInstruction },
        ...conversationMessages as any,
        { role: 'user', content: userMessage },
      ],
      tools: tools.length > 0 ? tools : undefined,
    });

    let message = response.choices[0]?.message as any;

    if (message?.tool_calls) {
      const toolMessages: any[] = [
        { role: 'system', content: systemPrompt + extractionInstruction },
        ...conversationMessages as any,
        { role: 'user', content: userMessage },
        message,
      ];

      for (const toolCall of (message.tool_calls as any[])) {
        let result = '';
        const args = JSON.parse(toolCall.function.arguments);
        
        try {
          if (toolCall.function.name === 'list_available_times') {
            const events = await googleCalendarService.listEvents(instanceId, args.timeMin, args.timeMax);
            result = JSON.stringify(events);
          } else if (toolCall.function.name === 'schedule_appointment') {
            const event = await googleCalendarService.scheduleEvent(instanceId, args.summary, args.startTime, args.endTime, args.email);
            result = `Agendado: ${event.id}`;
          } else if (toolCall.function.name === 'sync_to_crm') {
            const fullLead = await prisma.lead.findFirst({ where: { phone: lead?.phone } });
            if (fullLead) await notionService.syncLead(instanceId, fullLead);
            result = 'Sincronizado!';
          }
        } catch (e: any) {
          result = `Erro: ${e.message}`;
        }

        toolMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: result,
        });
      }

      const secondResponse = await openRouter.chat.completions.create({
        model: agent.aiModel || 'openai/gpt-4o-mini',
        messages: toolMessages,
      });
      message = secondResponse.choices[0]?.message;
    }

    const responseText = message?.content || '';

    // Extrai o lead update do JSON
    const leadUpdate = this.extractLeadUpdate(responseText);
    const cleanText = responseText.replace(/<lead_update>[\s\S]*?<\/lead_update>/g, '').trim();

    return {
      text: cleanText,
      leadUpdate,
    };
  },

  buildSystemPrompt(
    basePrompt: string,
    instructions: string,
    lead?: LeadContext,
    tone?: string,
    language?: string,
    guardrails?: string | null
  ): string {
    const leadContext = lead ? `
<cliente>
Nome: ${lead.name || 'Não informado'}
Email: ${lead.email || 'Não informado'}
Status: ${lead.status}
Score: ${lead.score || 0}/100
Notas: ${lead.notes || 'Nenhuma'}
</cliente>
` : '';

    const toneConfig = tone ? `
<personalidade>
Tom: ${tone}
Ajuste sua comunicação para refletir esta personalidade.
</personalidade>
` : '';

    const languageConfig = language ? `
<idioma>
Idioma: ${language}
Responda sempre neste idioma/variante.
</idioma>
` : '';

    return `
${basePrompt}

<instrucoes_especificas>
${instructions}
</instrucoes_especificas>

<diretrizes>
- Seja natural e amigável
- Faça uma pergunta por vez
- Não seja muito longo nas respostas
- Foque em entender as necessidades do cliente
- Guide a conversa para conversão
- Use emojis com moderação
</diretrizes>

${guardrails ? `
<guardrails>
REGRAS ESTRITAS DE COMPORTAMENTO E PROTEÇÃO (NUNCA QUEBRE):
${guardrails}
================
SE O USUÁRIO PERGUNTAR ALGO FORA DAS REGRAS ACIMA, MUDE DE ASSUNTO OU NEGUE EDUCADAMENTE. NUNCA FORNEÇA INFORMAÇÕES QUE VIOLEM ESTAS REGRAS.
</guardrails>
` : ''}

${toneConfig}
${languageConfig}
${leadContext}

Seja persuasivo mas autêntico. Seu objetivo é ajudar o cliente a tomar a melhor decisão.
`;
  },

  /**
   * Detecta se humano está respondendo baseado no tempo entre mensagens
   */
  async detectHumanIntervention(conversationId: string): Promise<boolean> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: 4,
    });

    if (messages.length < 4) return false;

    // Pega as últimas 2 mensagens do usuário
    const userMessages = messages.filter(m => m.direction === 'INBOUND').slice(0, 2);

    // Se houve 2+ mensagens do usuário em rápida sucessão (< 3 segundos),
    // provavelmente é um humano digitando
    if (userMessages.length >= 2) {
      const timeDiff = Math.abs(
        userMessages[0].timestamp.getTime() - userMessages[1].timestamp.getTime()
      );
      if (timeDiff < 3000) {
        return true;
      }
    }

    // Verifica se há mensagens consecutivas do usuário (humano pode ter respondido rápido)
    const lastTwoMessages = messages.slice(0, 2);
    if (
      lastTwoMessages[0]?.direction === 'INBOUND' &&
      lastTwoMessages[1]?.direction === 'INBOUND'
    ) {
      const timeDiff = lastTwoMessages[0].timestamp.getTime() - lastTwoMessages[1].timestamp.getTime();
      if (timeDiff < 5000) {
        return true;
      }
    }

    return false;
  },

  extractLeadUpdate(text: string): AIResponse['leadUpdate'] {
    const match = text.match(/<lead_update>([\s\S]*?)<\/lead_update>/);
    if (!match) return undefined;

    try {
      const json = match[1].trim();
      const parsed = JSON.parse(json);
      return parsed;
    } catch {
      return undefined;
    }
  },

  /**
   * Analisa se a conversa deve ser transferida para humano
   */
  shouldTransferToHuman(messages: MessageContext[]): boolean {
    const lastMessages = messages.slice(-5);
    const transferKeywords = [
      'falar com atendente',
      'falar com humano',
      'atendimento humano',
      'quero falar com alguém',
      'transferir',
      'suporte',
      'reclamação',
      'problema',
    ];

    return lastMessages.some(msg =>
      msg.role === 'user' &&
      transferKeywords.some(keyword =>
        msg.content.toLowerCase().includes(keyword)
      )
    );
  },
};
