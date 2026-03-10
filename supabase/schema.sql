-- SCRIPT DE ESTRUTURA ATUALIZADO - BARBERSOFT (CODERX)
-- Data: 10/03/2026
-- Descrição: Inclui tabelas de configurações, agendamentos com status e base de clientes única.

-- 1. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_barbearia text NOT NULL,
  horario_abertura time NOT NULL DEFAULT '08:00',
  horario_fechamento time NOT NULL DEFAULT '19:00',
  intervalo_minutos int4 NOT NULL DEFAULT 30,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- 2. TABELA DE CLIENTES (Base única para relatórios e fidelidade)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT UNIQUE NOT NULL, -- Chave para evitar duplicados
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id), -- Vínculo para o Dashboard
  nome_cliente text NOT NULL,
  telefone_cliente text NOT NULL,
  data_hora timestamptz NOT NULL,
  servico text,
  status TEXT DEFAULT 'pendente', -- pendente, concluido
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_agendamento_horario UNIQUE (data_hora) -- Impede dois clientes no mesmo horário
);

-- 4. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);

-- 5. INSERÇÃO INICIAL DE CONFIGURAÇÃO
INSERT INTO configuracoes (nome_barbearia, horario_abertura, horario_fechamento, intervalo_minutos)
VALUES ('BarberShop CoderX', '08:00', '19:00', 30)
ON CONFLICT DO NOTHING;

-- Atualização da tabela de configurações para o ecossistema Agendei.vc
ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS tema TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS dias_trabalho JSONB DEFAULT '["segunda", "terca", "quarta", "quinta", "sexta"]';

-- Comentário de segurança para garantir acesso público à leitura das configs (necessário para o Login e Home)
CREATE POLICY "Permitir leitura pública de configurações" 
ON configuracoes FOR SELECT USING (true);