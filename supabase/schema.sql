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
VALUES ('Minha Empresa - Agendei.vc', '08:00', '19:00', 30)
ON CONFLICT DO NOTHING;

-- Atualização da tabela de configurações para o ecossistema Agendei.vc
ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS tema TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS dias_trabalho JSONB DEFAULT '["segunda", "terca", "quarta", "quinta", "sexta"]';

-- Comentário de segurança para garantir acesso público à leitura das configs (necessário para o Login e Home)
CREATE POLICY "Permitir leitura pública de configurações" 
ON configuracoes FOR SELECT USING (true);

-- Índices para acelerar o Dashboard Analítico
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_data ON agendamentos(status, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);

-- Adiciona suporte para notificações por e-mail
ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS email_notificacao TEXT;

-- 1. Adiciona a chave mestra de modalidade (Booleano)
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS multi_atendente BOOLEAN DEFAULT false;

-- 2. Tabela de Atendentes (Com suporte a Login e Permissões)
CREATE TABLE IF NOT EXISTS atendentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE, -- ID que liga ao e-mail/senha do Supabase Auth
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  foto_url TEXT,
  permissao TEXT DEFAULT 'apenas_agenda', -- 'completo' ou 'apenas_agenda'
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Prepara a tabela de agendamentos para múltiplos profissionais
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES atendentes(id);

-- 4. MIGRAÇÃO DA REGRA DE HORÁRIO (O pulo do gato)
-- Primeiro, removemos a trava antiga que era "um por horário no mundo todo"
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS unique_agendamento_horario;

-- Segundo, criamos a trava "um por atendente por horário"
-- No modo Autônomo (atendente_id é NULL), ela continua barrando horários duplicados normalmente.
ALTER TABLE agendamentos ADD CONSTRAINT unique_atendente_horario UNIQUE (atendente_id, data_hora);

-- Garante que todos (mesmo deslogados na home) possam ver as fotos e nomes dos atendentes
CREATE POLICY "Leitura pública de atendentes" 
ON atendentes FOR SELECT USING (true);

-- Garante que usuários logados possam inserir/editar fotos no bucket
-- (Troque 'logos' pelo nome do seu bucket se for diferente)
CREATE POLICY "Permitir upload de fotos de perfil"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');