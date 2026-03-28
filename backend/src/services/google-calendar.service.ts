import { google } from 'googleapis';
import { integrationService } from './integration.service';

export const googleCalendarService = {
  async getAuth(instanceId: string) {
    const integration = await integrationService.findByInstanceAndType(instanceId, 'GOOGLE_CALENDAR');
    
    if (!integration || !integration.isActive) {
      throw new Error('Google Calendar integration not found or inactive');
    }

    const config = integration.config as any;
    
    if (!config.credentials) {
      throw new Error('Google Calendar credentials not configured');
    }

    // Support both Service Account and OAuth2 tokens
    if (config.credentials.client_email) {
      // Service Account
      return new google.auth.JWT({
        email: config.credentials.client_email,
        key: config.credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    } else {
      // OAuth2 Client
      const auth = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret
      );
      auth.setCredentials(config.credentials);
      return auth;
    }
  },

  async listEvents(instanceId: string, timeMin: string, timeMax: string) {
    const auth = await this.getAuth(instanceId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items;
  },

  async scheduleEvent(instanceId: string, summary: string, startTime: string, endTime: string, email?: string) {
    const auth = await this.getAuth(instanceId);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary,
      start: {
        dateTime: startTime,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/Sao_Paulo',
      },
      attendees: email ? [{ email }] : [],
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  },
};
