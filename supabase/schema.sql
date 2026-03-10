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

-- 4. Criar a tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT UNIQUE NOT NULL, -- O telefone será nossa chave de busca
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Adicionar uma coluna de referência na tabela de agendamentos (opcional, mas recomendado para relatórios)
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);

-- 6. Adiciona a coluna status com o valor padrão 'pendente'
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';

-- 7. Criar um índice para deixar o dashboard mais rápido
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);