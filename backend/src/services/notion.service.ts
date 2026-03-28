import { Client } from '@notionhq/client';
import { integrationService } from './integration.service';
import { Lead } from '@prisma/client';

export const notionService = {
  async syncLead(instanceId: string, lead: Lead) {
    const integration = await integrationService.findByInstanceAndType(instanceId, 'NOTION');
    
    if (!integration || !integration.isActive) {
      return;
    }

    const { apiKey, databaseId } = integration.config as { apiKey: string; databaseId: string };
    
    if (!apiKey || !databaseId) {
      return;
    }

    const notion = new Client({ auth: apiKey });

    // Check if lead already exists in Notion (by phone)
    const response = await (notion.databases as any).query({
      database_id: databaseId,
      filter: {
        property: 'WhatsApp',
        phone_number: {
          equals: lead.phone,
        },
      },
    });

    const properties: any = {
      'Nome': {
        title: [
          {
            text: {
              content: lead.name || 'Sem Nome',
            },
          },
        ],
      },
      'WhatsApp': {
        phone_number: lead.phone,
      },
      'Status': {
        select: {
          name: lead.status,
        },
      },
      'Score': {
        number: lead.score || 0,
      },
      'Email': {
        email: lead.email || null,
      },
      'Notas': {
        rich_text: [
          {
            text: {
              content: lead.notes || '',
            },
          },
        ],
      },
      'Ultima Atualizacao': {
        date: {
          start: new Date().toISOString(),
        },
      },
    };

    if (response.results.length > 0) {
      // Update existing page
      await notion.pages.update({
        page_id: response.results[0].id,
        properties,
      });
    } else {
      // Create new page
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });
    }
  },
};
