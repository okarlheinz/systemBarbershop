-- ==========================================================
-- SCRIPT DE ESTRUTURA COMPLETO - AGENDEI.VC (POWERED BY CODERX)
-- Data da última atualização: 10/03/2026
-- Descrição: Configurações, Clientes, Atendentes e Agendamentos
-- ==========================================================

-- 1. TABELA DE CONFIGURAÇÕES (Identidade Visual e Regras de Negócio)
CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_barbearia text NOT NULL,
  horario_abertura time NOT NULL DEFAULT '08:00',
  horario_fechamento time NOT NULL DEFAULT '19:00',
  intervalo_minutos int4 NOT NULL DEFAULT 30,
  logo_url text,
  tema TEXT DEFAULT 'light',
  dias_trabalho JSONB DEFAULT '["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]',
  multi_atendente BOOLEAN DEFAULT true,
  email_notificacao TEXT,
  created_at timestamptz DEFAULT now()
);

-- 2. TABELA DE ATENDENTES (Equipe)
CREATE TABLE IF NOT EXISTS atendentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE, -- Vinculado ao Supabase Auth
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  foto_url TEXT,
  permissao TEXT DEFAULT 'apenas_agenda', -- 'completo' ou 'apenas_agenda'
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE CLIENTES (Base Única para Fidelidade)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT UNIQUE NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE AGENDAMENTOS (O Coração do Sistema)
CREATE TABLE IF NOT EXISTS agendamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  atendente_id UUID REFERENCES atendentes(id), -- FK para o profissional escolhido
  nome_cliente text NOT NULL,
  telefone_cliente text NOT NULL,
  data_hora timestamptz NOT NULL,
  servico text,
  status TEXT DEFAULT 'pendente', -- pendente, concluido
  created_at timestamptz DEFAULT now()
);

-- CRIAÇÃO DO USUARIO ADMIN
-- Usuário com UUID fixo (mais fácil para referenciar no script)
DO $$
DECLARE
    user_id uuid := '11111111-1111-1111-1111-111111111111'::uuid; -- UUID fixo
BEGIN
    -- Inserir usuário
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        user_id,
        'authenticated',
        'authenticated',
        'admin@agendeitu.com.br',
        crypt('Z$fs05c3', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    -- Inserir identidade (sem ON CONFLICT, apenas INSERT)
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        jsonb_build_object('sub', user_id, 'email', 'admin@agendeitu.com.br'),
        'email',
        'admin@agendeitu.com.br',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING; -- Usando a constraint correta
END;
$$;

-- 5. REGRAS DE UNICIDADE (CORREÇÃO APLICADA)
-- Removemos travas globais e garantimos que o horário seja único POR ATENDENTE
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS unique_agendamento_horario;
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS unique_atendente_horario;
ALTER TABLE agendamentos ADD CONSTRAINT unique_horario_atendente UNIQUE (data_hora, atendente_id);

-- 6. ÍNDICES DE PERFORMANCE (Dashboard e Busca)
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_data ON agendamentos(status, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_atendente ON agendamentos(atendente_id);

-- 7. INSERÇÃO INICIAL (Apenas se a tabela estiver vazia)
INSERT INTO configuracoes (nome_barbearia, horario_abertura, horario_fechamento, intervalo_minutos)
VALUES ('Agendei.tu - Sua Empresa', '08:00', '19:00', 30)
ON CONFLICT DO NOTHING;

-- 8. POLÍTICAS DE ACESSO (RLS)
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de configurações" ON configuracoes FOR SELECT USING (true);

ALTER TABLE atendentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de atendentes" ON atendentes FOR SELECT USING (true);

ALTER TABLE configuracoes 
ADD COLUMN IF NOT EXISTS email_notificacao TEXT;

-- 9. CRIAR TABELA DE PARAMETROS E PRIMEIRO PARAMETRO

-- 10. Criar a tabela de parâmetros
CREATE TABLE IF NOT EXISTS parametros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    ativo INTEGER DEFAULT 0, -- 1 para Ativo, 0 para Inativo
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Inserir o primeiro parâmetro (conforme solicitado)
INSERT INTO parametros (nome, descricao, ativo)
VALUES ('HORARIOATENDENTE', 'INFORMA SE O HORARIO DE FUNCIONAMENTO SERÁ POR ATENDENTE EM VEZ DE SER POR EMPRESA', 0)
ON CONFLICT (nome) DO NOTHING;

-- 12. FUncionamento do parâmetro HORARIOATENDENTE
CREATE TABLE IF NOT EXISTS atendente_disponibilidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendente_id UUID REFERENCES atendentes(id) ON DELETE CASCADE,
    dia_semana TEXT NOT NULL, -- 'segunda', 'terca', etc.
    horario TIME NOT NULL,
    UNIQUE(atendente_id, dia_semana, horario)
);