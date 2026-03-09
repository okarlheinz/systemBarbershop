'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Admin() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Verifica sessão e carrega dados
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = '/login'
      } else {
        await carregarAgendamentos()
        setCarregando(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    // Realtime: Atualiza a lista automaticamente quando houver mudanças no banco
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
      .order('data_hora', { ascending: true })
    if (data) setAgendamentos(data)
  }

  async function finalizar(id: string) {
    if (!confirm("Confirmar conclusão do atendimento?")) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Profissional */}
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Agenda do Dia</h1>
            <p className="text-gray-500 text-sm">Gerencie os cortes de hoje</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Sair
          </button>
        </header>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 uppercase font-bold">Total de Horários</p>
            <p className="text-2xl font-black text-black">{agendamentos.length}</p>
          </div>
          <div className="bg-black p-4 rounded-xl shadow-sm text-white">
            <p className="text-xs text-gray-400 uppercase font-bold">Próximo Cliente</p>
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
                <div key={ag.id} className="group p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                      {ag.nome_cliente.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900 leading-tight">{ag.nome_cliente}</p>
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
                      <p className="text-xl font-black text-black">{hora}</p>
                    </div>

                    <button
                      onClick={() => finalizar(ag.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-600 transition-all shadow-sm active:scale-95"
                      title="Finalizar atendimento"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
              <p className="text-gray-400 font-medium">Não há agendamentos para hoje.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}