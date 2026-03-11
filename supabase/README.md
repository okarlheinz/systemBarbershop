# 🚀 Agendei.vc - Powered by CoderX

O **Agendei.vc** é um software de agendamento "White Label" de alta performance, projetado para barbearias, clínicas e prestadores de serviços que buscam automação e análise de dados.

## ✨ Funcionalidades Atuais
- **Multi-Atendentes**: Suporte para vários profissionais trabalharem no mesmo horário sem conflitos de agenda.
- **Dashboard Analítico**: Visualização de horários de pico, dias de maior movimento e ranking de clientes fiéis.
- **Recuperação de Clientes**: Filtro automático para clientes ausentes há mais de 30 dias com botão direto para WhatsApp.
- **Temas Dinâmicos**: Interface que se adapta às cores da marca (Light, Dark, Rosa).
- **Base de Clientes Inteligente**: Reconhecimento automático por telefone para evitar cadastros duplicados.

## 🛠️ Tecnologias Utilizadas
- **Frontend**: Next.js 14 (App Router)
- **Estilização**: Tailwind CSS & Lucide Icons
- **Backend/Banco**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth

## 🚀 Instalação e Configuração

1. **Banco de Dados**: Execute o script `schema.sql` no SQL Editor do seu projeto Supabase.
2. **Storage**:
   - Crie um bucket público chamado `logos`.
   - Adicione uma Policy para permitir `INSERT` e `SELECT`.
3. **Variáveis de Ambiente**:
   Crie um arquivo `.env.local` na raiz com:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_key_aqui