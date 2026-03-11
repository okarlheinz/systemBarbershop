'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'

export default function Admin() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Estado para controlar o layout dinâmico
  const [permissao, setPermissao] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = '/login'
      } else {
        // Recupera a permissão para ajustar o layout
        const nivel = localStorage.getItem('user_permissao') || 'completo'
        setPermissao(nivel)
        
        await carregarAgendamentos()
        setCarregando(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('agendamentos-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, () => {
        carregarAgendamentos()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function carregarAgendamentos() {
    const { data } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('status', 'pendente')
      .order('data_hora', { ascending: true })

    if (data) setAgendamentos(data)
  }

  async function finalizar(id: string) {
    if (!confirm("Confirmar conclusão do atendimento?")) return
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'concluido' })
      .eq('id', id)

    if (!error) setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  async function remover(id: string) {
    if (!confirm("Deseja remover este agendamento? O horário será liberado imediatamente.")) return
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id)

    if (!error) {
      setAgendamentos(prev => prev.filter(a => a.id !== id))
    } else {
      alert("Erro ao remover: " + error.message)
    }
  }

  // Define se deve aplicar a margem da sidebar ou centralizar total
  const isRestrito = permissao === 'apenas_agenda'

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar />

      {/* Ajuste dinâmico: Se for restrito, removemos o lg:ml-64 e adicionamos mt-20 para o Header */}
      <main className={`
        flex-1 flex flex-col items-center p-4 md:p-8 transition-all duration-300
        ${isRestrito ? 'ml-0 mt-20' : 'ml-0 lg:ml-64'}
      `}>

        <div className="w-full max-w-4xl">
          {/* Header da Agenda */}
          <header className="flex justify-between items-center mb-8 bg-background p-6 rounded-2xl shadow-sm border border-border mt-12 lg:mt-0">
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter">Agenda do Dia</h1>
              <p className="text-gray-500 text-sm">Gerencie os atendimentos</p>
            </div>
          </header>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
              <p className="text-xs text-gray-400 uppercase font-bold">Total de Horários</p>
              <p className="text-2xl font-black text-foreground">{agendamentos.length}</p>
            </div>
            <div className="bg-primary p-4 rounded-xl shadow-sm text-white">
              <p className="text-xs text-foreground uppercase font-bold opacity-80">Próximo Cliente</p>
              <p className="text-xl font-bold truncate">
                {agendamentos[0]?.nome_cliente || "Ninguém"}
              </p>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          <div className="space-y-4">
            {carregando ? (
              <div className="text-center py-10 text-gray-400">Carregando agenda...</div>
            ) : agendamentos.length > 0 ? (
              agendamentos.map((ag) => {
                const data = new Date(ag.data_hora)
                const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
                const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

                return (
                  <div key={ag.id} className="group p-5 bg-background border border-border rounded-2xl shadow-sm hover:bg-hover/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-foreground">
                        {ag.nome_cliente.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground leading-tight">{ag.nome_cliente}</p>
                        <a
                          href={`https://wa.me/55${ag.telefone_cliente.replace(/\D/g, '')}?text=Olá ${ag.nome_cliente}, confirmo seu horário hoje às ${hora}!`}
                          target="_blank"
                          className="text-green-600 text-sm font-semibold flex items-center gap-1 hover:text-green-700 mt-1"
                        >
                          <span className="text-lg">📱</span> {ag.telefone_cliente}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-none pt-4 md:pt-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">{dia}</p>
                        <p className="text-xl font-black text-foreground">{hora}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => remover(ag.id)}
                          className="bg-red-500 text-white px-3 py-2 rounded-xl font-bold hover:bg-red-600 transition-all shadow-sm"
                        >
                          Remover
                        </button>
                        <button
                          onClick={() => finalizar(ag.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-600 transition-all shadow-sm"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-background p-12 rounded-2xl border border-dashed border-gray-300 text-center">
                <p className="text-gray-400 font-medium">Não há agendamentos para hoje.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}