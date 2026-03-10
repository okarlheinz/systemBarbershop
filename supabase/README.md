# BarberSoft - Sistema de Gestão de Barbearia (CoderX)

## 🚀 Instruções de Instalação do Banco
1. Crie um novo projeto no **Supabase**.
2. Vá ao **SQL Editor** e crie uma nova "Query".
3. Copie e cole o conteúdo do arquivo `schema.sql` atualizado e execute.
4. Vá em **Storage**, crie um Bucket público chamado `logos`.
5. Em **Policies** do bucket, habilite `INSERT`, `UPDATE` e `SELECT` para usuários autenticados.
6. Copie as credenciais (URL e Anon Key) para o seu arquivo `.env.local`.

## 🛠️ Novas Funcionalidades Implementadas
- **Dashboard de Gestão**: Relatórios automáticos de clientes mais atendidos e horários de pico.
- **Base de Clientes Única**: O sistema reconhece clientes recorrentes pelo telefone e atualiza os nomes automaticamente.
- **Gestão de Status**: 
  - **Concluir**: Finaliza o atendimento e envia os dados para o Dashboard.
  - **Remover**: Elimina o agendamento e liberta o horário imediatamente para o site.
- **Temas Dinâmicos**: Suporte total a temas Light, Dark e Rosa (Pink) em todas as telas administrativas.

# 🚀 Agendei.vc - Powered by CoderX

O **Agendei.vc** é um software de agendamento "White Label" projetado para ser adaptável a qualquer modelo de negócio (Barbearias, Clínicas, Consultórios, etc).

## ✨ Novidades desta Versão
- **Rebranding Total**: Transição de BarberSoft para Agendei.vc.
- **Dynamic Theming**: O administrador escolhe a cor do sistema (Light, Dark, Rosa) e a interface do cliente se adapta automaticamente.
- **Controle de Calendário**: Possibilidade de definir dias da semana em que a empresa não atende, bloqueando agendamentos nessas datas.
- **Identidade Visual**: Logo e Nome da empresa carregados dinamicamente em todas as telas, incluindo Login.

## 🛠️ Tecnologias
- Next.js 14
- Supabase (Auth & Database)
- Tailwind CSS (Temas Dinâmicos)

## 📦 Dependências Adicionais
- `lucide-react` (Ícones do Dashboard)
- `resend` (Opcional - para disparos de e-mail)

---
*Desenvolvido por CoderX - 2026*