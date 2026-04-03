-- AlterTable: Instance - adiciona telefone de suporte humano
ALTER TABLE "instances" ADD COLUMN "supportPhone" TEXT;

-- AlterTable: Lead - adiciona tags
ALTER TABLE "leads" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Discharge - adiciona ideias de mensagem IA e config pós-envio
ALTER TABLE "discharges" ADD COLUMN "aiIdeas" TEXT;
ALTER TABLE "discharges" ADD COLUMN "postSendConfig" JSONB;
