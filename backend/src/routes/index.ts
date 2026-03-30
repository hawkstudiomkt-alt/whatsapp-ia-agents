import { FastifyInstance } from 'fastify';
import { instanceController } from '../controllers/instance.controller';
import { agentController } from '../controllers/agent.controller';
import { leadController } from '../controllers/lead.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { webhookController } from '../controllers/webhook.controller';
import { humanAttendeeController } from '../controllers/human-attendee.controller';
import { dischargeController } from '../controllers/discharge.controller';
import { followupController } from '../controllers/followup.controller';
import { integrationController } from '../controllers/integration.controller';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function routes(app: FastifyInstance) {
  // Health check (público)
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Auth (público)
  app.post('/auth/login', authController.login.bind(authController));
  app.get('/auth/me', { preHandler: authMiddleware }, authController.me.bind(authController));

  // Webhook (público — chamado pela Evolution API)
  app.post('/webhook/:apiKey', webhookController.handle.bind(webhookController));
  app.post('/webhook', webhookController.handle.bind(webhookController));

  // Rotas protegidas
  const protected_routes = async (app: FastifyInstance) => {
    app.addHook('preHandler', authMiddleware);

    // Instâncias
    app.post('/instances', instanceController.create.bind(instanceController));
    app.get('/instances', instanceController.findAll.bind(instanceController));
    app.get('/instances/:id', instanceController.findById.bind(instanceController));
    app.put('/instances/:id', instanceController.update.bind(instanceController));
    app.delete('/instances/:id', instanceController.delete.bind(instanceController));
    app.post('/instances/:id/qr', instanceController.generateQRCode.bind(instanceController));

    // Agentes
    app.post('/agents', agentController.create.bind(agentController));
    app.get('/agents', agentController.findAll.bind(agentController));
    app.get('/agents/:id', agentController.findById.bind(agentController));
    app.put('/agents/:id', agentController.update.bind(agentController));
    app.delete('/agents/:id', agentController.delete.bind(agentController));
    app.get('/instances/:instanceId/agents', agentController.findByInstance.bind(agentController));

    // Leads
    app.post('/leads', leadController.create.bind(leadController));
    app.get('/leads', leadController.findAll.bind(leadController));
    app.get('/leads/:id', leadController.findById.bind(leadController));
    app.put('/leads/:id', leadController.update.bind(leadController));
    app.patch('/leads/:id/status', leadController.updateStatus.bind(leadController));

    // Analytics
    app.get('/analytics/summary', analyticsController.getSummary.bind(analyticsController));
    app.get('/analytics/daily', analyticsController.getDailyAnalytics.bind(analyticsController));
    app.get('/analytics/agents/:agentId', analyticsController.getAgentPerformance.bind(analyticsController));

    // Atendentes Humanos
    app.post('/human-attendees', humanAttendeeController.create.bind(humanAttendeeController));
    app.get('/human-attendees', humanAttendeeController.findAll.bind(humanAttendeeController));
    app.patch('/human-attendees/:id/status', humanAttendeeController.updateStatus.bind(humanAttendeeController));
    app.post('/human-attendees/assign', humanAttendeeController.assign.bind(humanAttendeeController));
    app.get('/human-attendees/:attendeeId/assignments', humanAttendeeController.getAssignments.bind(humanAttendeeController));
    app.post('/human-attendees/assignments/:assignmentId/complete', humanAttendeeController.completeAssignment.bind(humanAttendeeController));

    // Disparos
    app.post('/discharges', dischargeController.create.bind(dischargeController));
    app.get('/discharges', dischargeController.findAll.bind(dischargeController));
    app.get('/discharges/:id', dischargeController.findById.bind(dischargeController));
    app.post('/discharges/:id/start', dischargeController.start.bind(dischargeController));
    app.post('/discharges/:id/cancel', dischargeController.cancel.bind(dischargeController));

    // Follow-ups
    app.post('/followups', followupController.create.bind(followupController));
    app.get('/followups', followupController.findAll.bind(followupController));
    app.delete('/followups/:id', followupController.delete.bind(followupController));

    // Integrações
    app.post('/integrations', integrationController.upsert.bind(integrationController));
    app.get('/instances/:instanceId/integrations', integrationController.findByInstance.bind(integrationController));
    app.delete('/instances/:instanceId/integrations/:type', integrationController.delete.bind(integrationController));
  };

  app.register(protected_routes);
}