'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'

export default function Admin() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [permissao, setPermissao] = useState<string | null>(null)
  
  // --- MEUS NOVOS ESTADOS PARA FILTRAGEM MASTER ---
  const [atendentes, setAtendentes] = useState<any[]>([])
  const [filtroAtendente, setFiltroAtendente] = useState<string>('todos')

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = '/login'
      } else {
        const nivel = localStorage.getItem('user_permissao') || 'completo'
        setPermissao(nivel)
        
        // Se for Master, carregamos a lista de atendentes para o filtro
        if (nivel === 'completo') {
          const { data: lista } = await supabase.from('atendentes').select('id, nome')
          setAtendentes(lista || [])
        }

        await carregarAgendamentos(nivel, 'todos')
        setCarregando(false)
      }
    }
    checkSession()
  }, [])

  // Recarrega a agenda sempre que o filtro mudar
  useEffect(() => {
    if (permissao) carregarAgendamentos(permissao, filtroAtendente)
  }, [filtroAtendente])

  async function carregarAgendamentos(nivel: string, atendenteId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Buscamos os agendamentos trazendo também o nome do atendente (JOIN)
    let query = supabase
      .from('agendamentos')
      .select('*, atendentes(nome)')
      .eq('status', 'pendente')

    // LÓGICA DE PRIVACIDADE E FILTRAGEM
    if (nivel === 'apenas_agenda') {
      // Se for funcionário, forçamos a filtragem pelo ID dele vinculado ao Auth
      const { data: perfil } = await supabase.from('atendentes').select('id').eq('auth_user_id', user?.id).single()
      if (perfil) query = query.eq('atendente_id', perfil.id)
    } else if (atendenteId !== 'todos') {
      // Se for Master e escolheu um atendente no filtro
      query = query.eq('atendente_id', atendenteId)
    }

    const { data } = await query.order('data_hora', { ascending: true })
    if (data) setAgendamentos(data)
  }

  // Funções de Finalizar e Remover permanecem as mesmas
  async function finalizar(id: string) {
    if (!confirm("Confirmar conclusão do atendimento?")) return
    const { error } = await supabase.from('agendamentos').update({ status: 'concluido' }).eq('id', id)
    if (!error) setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  async function remover(id: string) {
    if (!confirm("Deseja remover este agendamento?")) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  const isRestrito = permissao === 'apenas_agenda'

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar />

      <main className={`flex-1 flex flex-col items-center p-4 md:p-8 transition-all duration-300 ${isRestrito ? 'ml-0 mt-20' : 'ml-0 lg:ml-64'}`}>
        
        <div className="w-full max-w-4xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-background p-6 rounded-2xl shadow-sm border border-border mt-12 lg:mt-0 gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter">Agenda do Dia</h1>
              <p className="text-gray-500 text-sm">Olá, {permissao === 'completo' ? 'Administrador' : 'Atendente'}</p>
            </div>

            {/* --- FILTRO DE ATENDENTES (Visível apenas para Master) --- */}
            {!isRestrito && (
              <div className="w-full md:w-auto">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Filtrar por Profissional</label>
                <select 
                  value={filtroAtendente}
                  onChange={(e) => setFiltroAtendente(e.target.value)}
                  className="bg-card border border-border p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none w-full"
                >
                  <option value="todos">Todos os profissionais</option>
                  {atendentes.map(at => (
                    <option key={at.id} value={at.id}>{at.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </header>

          <div className="space-y-4">
            {carregando ? (
              <div className="text-center py-10 text-gray-400">Carregando agendamentos...</div>
            ) : agendamentos.length > 0 ? (
              agendamentos.map((ag) => {
                const data = new Date(ag.data_hora)
                const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

                return (
                  <div key={ag.id} className="group p-5 bg-background border border-border rounded-2xl shadow-sm hover:bg-hover/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-foreground">
                        {ag.nome_cliente.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground leading-tight">{ag.nome_cliente}</p>
                        
                        {/* --- EXIBIÇÃO DO ATENDENTE NO CARD --- */}
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-[10px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-md uppercase w-fit">
                            Profissional: {ag.atendentes?.nome || 'Não definido'}
                          </span>
                          <a
                            href={`https://wa.me/55${ag.telefone_cliente.replace(/\D/g, '')}`}
                            target="_blank"
                            className="text-green-600 text-sm font-semibold flex items-center gap-1 hover:underline"
                          >
                            📱 {ag.telefone_cliente}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-none pt-4 md:pt-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">{dia}</p>
                        <p className="text-xl font-black text-foreground">{hora}</p>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => remover(ag.id)} className="bg-red-500 text-white px-3 py-2 rounded-xl font-bold hover:bg-red-600 transition-all">
                          Remover
                        </button>
                        <button onClick={() => finalizar(ag.id)} className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-600 transition-all">
                          Concluir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-background p-12 rounded-2xl border border-dashed border-gray-300 text-center">
                <p className="text-gray-400 font-medium">Nenhum agendamento encontrado para este filtro.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}