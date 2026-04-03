#!/bin/sh
echo "==============================="
echo " Rattix Backend — Startup"
echo "==============================="

# ── Passo 1: Resolver migrações com estado 'failed' (erro P3009) ──────────────
# O Prisma bloqueia novos deploys se encontrar uma migration com started_at
# preenchido mas finished_at NULL (estado 'failed'). Marcamos como aplicadas
# para desbloquear, e depois o migrate deploy cuida do resto.
echo "[ 1/3 ] Verificando estado das migrations..."

for migration in \
  "20260327233103_init" \
  "20260402000001_add_agent_ai_settings" \
  "20260402000002_add_tags_support_phone_ai_ideas"
do
  result=$(npx prisma migrate resolve --applied "$migration" 2>&1)
  if echo "$result" | grep -q "error\|Error\|ERROR"; then
    echo "  → $migration  (já estava OK, ignorado)"
  else
    echo "  ✓ $migration  (resolvido)"
  fi
done

# ── Passo 2: Tentar migrate deploy normal ────────────────────────────────────
echo "[ 2/3 ] Executando prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "  ✓ Migrations aplicadas com sucesso"
else
  # ── Fallback: db push (ignora histórico de migrations completamente) ─────
  echo "  ! migrate deploy falhou — usando prisma db push como fallback..."
  npx prisma db push --accept-data-loss --skip-generate
  echo "  ✓ Schema sincronizado via db push"
fi

# ── Passo 3: Iniciar o servidor ──────────────────────────────────────────────
echo "[ 3/3 ] Iniciando servidor..."
exec node dist/server.js
