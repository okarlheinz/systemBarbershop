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

---
*Desenvolvido por CoderX - 2026*