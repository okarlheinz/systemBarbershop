-- SCRIPT DE ESTRUTURA - CODERX BARBERSHOP
-- Data: 09/03/2026

-- 1. TABELA DE CONFIGURAÇÕES (Onde salvamos o que o cliente edita)
CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_barbearia text NOT NULL,
  horario_abertura time NOT NULL DEFAULT '08:00',
  horario_fechamento time NOT NULL DEFAULT '19:00',
  intervalo_minutos int4 NOT NULL DEFAULT 30,
  logo_url text, -- URL vinda do Storage que configuramos hoje
  created_at timestamptz DEFAULT now()
);

-- 2. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome text NOT NULL,
  cliente_whatsapp text NOT NULL,
  data_hora timestamptz NOT NULL,
  servico text,
  finalizado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. INSERÇÃO INICIAL (Dados padrão para o sistema funcionar no primeiro boot)
-- Isso garante que ao rodar o script, o sistema já tenha uma linha de config para editar
INSERT INTO configuracoes (nome_barbearia, horario_abertura, horario_fechamento, intervalo_minutos)
VALUES ('Minha Barbearia', '08:00', '19:00', 30)
ON CONFLICT DO NOTHING;