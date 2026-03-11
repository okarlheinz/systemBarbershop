'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Calendar, Users, AlertCircle, TrendingUp, BarChart3, Scissors, RefreshCw } from 'lucide-react'

export default function Dashboard() {
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [filtro, setFiltro] = useState('mes')
    const [topClientes, setTopClientes] = useState<{ nome: string; total: number }[]>([])
    const [atendimentosPorFuncionario, setAtendimentosPorFuncionario] = useState<{ nome: string; total: number }[]>([])
    const [fluxoHorarios, setFluxoHorarios] = useState<{ hora: string; total: number }[]>([])
    const [fluxoDias, setFluxoDias] = useState<{ dia: string; total: number; ordem: number }[]>([])
    const [clientesAusentes, setClientesAusentes] = useState<any[]>([])

    const diasSemanaMapa: { [key: number]: string } = {
        0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
    }

    const getDatasFiltro = () => {
        const hoje = new Date()
        let inicio = new Date()
        if (filtro === 'dia') inicio.setHours(0, 0, 0, 0)
        else if (filtro === 'semana') inicio.setDate(hoje.getDate() - 7)
        else if (filtro === 'mes') inicio.setMonth(hoje.getMonth() - 1)
        else if (filtro === 'ano') inicio.setFullYear(hoje.getFullYear() - 1)
        return { inicio: inicio.toISOString(), fim: hoje.toISOString() }
    }

    useEffect(() => {
        async function carregarDados() {
            setCarregando(true)
            setErro(null)
            try {
                const { inicio, fim } = getDatasFiltro()

                // 1. Busca configurações (dias de trabalho)
                const { data: config, error: errConfig } = await supabase
                    .from('configuracoes')
                    .select('dias_trabalho')
                    .single()
                if (errConfig) throw new Error('Erro ao carregar configurações: ' + errConfig.message)
                const diasTrabalho: string[] = config?.dias_trabalho || []

                // 2. Busca agendamentos CONCLUÍDOS com join nos atendentes
                const { data: agendamentos, error: errAgend } = await supabase
                    .from('agendamentos')
                    .select('nome_cliente, data_hora, atendentes(nome)')
                    .eq('status', 'concluido')
                    .gte('data_hora', inicio)
                    .lte('data_hora', fim)
                if (errAgend) throw new Error('Erro ao carregar agendamentos: ' + errAgend.message)

                if (agendamentos && agendamentos.length > 0) {
                    // Ranking por Funcionário
                    const contagemFunc: Record<string, number> = {}
                    agendamentos.forEach((a: any) => {
                        const nomeFunc = a.atendentes?.nome || 'Equipe'
                        contagemFunc[nomeFunc] = (contagemFunc[nomeFunc] || 0) + 1
                    })
                    setAtendimentosPorFuncionario(
                        Object.entries(contagemFunc)
                            .map(([nome, total]) => ({ nome, total }))
                            .sort((a, b) => b.total - a.total)
                    )

                    // Ranking de Clientes
                    const contagemClientes: Record<string, number> = {}
                    agendamentos.forEach(a => {
                        contagemClientes[a.nome_cliente] = (contagemClientes[a.nome_cliente] || 0) + 1
                    })
                    setTopClientes(
                        Object.entries(contagemClientes)
                            .map(([nome, total]) => ({ nome, total }))
                            .sort((a, b) => b.total - a.total)
                            .slice(0, 5)
                    )

                    // Fluxo de Horários
                    const contagemHoras: Record<string, number> = {}
                    agendamentos.forEach(a => {
                        const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                        }).split(':')[0]
                        contagemHoras[hora] = (contagemHoras[hora] || 0) + 1
                    })
                    setFluxoHorarios(
                        Object.entries(contagemHoras)
                            .map(([hora, total]) => ({ hora: `${hora}h`, total }))
                            .sort((a, b) => a.hora.localeCompare(b.hora))
                    )

                    // Fluxo de Dias da Semana
                    const contagemDias: Record<string, number> = {}
                    agendamentos.forEach(a => {
                        const diaNome = diasSemanaMapa[new Date(a.data_hora).getDay()]
                        if (diasTrabalho.includes(diaNome)) {
                            contagemDias[diaNome] = (contagemDias[diaNome] || 0) + 1
                        }
                    })
                    setFluxoDias(
                        diasTrabalho.map(dia => ({
                            dia: dia.charAt(0).toUpperCase() + dia.slice(1, 3),
                            total: contagemDias[dia] || 0,
                            ordem: Object.values(diasSemanaMapa).indexOf(dia)
                        })).sort((a, b) => a.ordem - b.ordem)
                    )
                } else {
                    // Se não houver agendamentos, limpa os estados
                    setAtendimentosPorFuncionario([])
                    setTopClientes([])
                    setFluxoHorarios([])
                    setFluxoDias([])
                }

                // 3. Clientes Ausentes (> 30 dias)
                const trintaDiasAtras = new Date()
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
                const { data: todosClientes, error: errClientes } = await supabase
                    .from('clientes')
                    .select('id, nome, telefone')
                if (errClientes) throw new Error('Erro ao carregar clientes: ' + errClientes.message)

                const { data: ultimosAgendamentos, error: errUltimos } = await supabase
                    .from('agendamentos')
                    .select('cliente_id, data_hora')
                    .order('data_hora', { ascending: false })
                if (errUltimos) throw new Error('Erro ao carregar últimos agendamentos: ' + errUltimos.message)

                if (todosClientes && ultimosAgendamentos) {
                    const ausentes = todosClientes
                        .filter(cliente => {
                            const ultimo = ultimosAgendamentos.find(a => a.cliente_id === cliente.id)
                            return ultimo && new Date(ultimo.data_hora) < trintaDiasAtras
                        })
                        .slice(0, 6)
                    setClientesAusentes(ausentes)
                }
            } catch (error: any) {
                console.error('Erro detalhado:', error)
                setErro(error.message || 'Erro desconhecido ao carregar dashboard')
            } finally {
                setCarregando(false)
            }
        }
        carregarDados()
    }, [filtro])

    // Recalcular máximos para barras
    const maxHoras = Math.max(...fluxoHorarios.map(h => h.total), 1)
    const maxDias = Math.max(...fluxoDias.map(d => d.total), 1)
    const maxFunc = Math.max(...atendimentosPorFuncionario.map(f => f.total), 1)

    if (carregando) {
        return (
            <div className="flex min-h-screen bg-background">
                <Sidebar />
                <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm font-medium text-gray-500">Carregando dashboard...</p>
                    </div>
                </main>
            </div>
        )
    }

    if (erro) {
        return (
            <div className="flex min-h-screen bg-background">
                <Sidebar />
                <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 flex items-center justify-center">
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Erro ao carregar dados</h2>
                        <p className="text-sm text-red-600 dark:text-red-300">{erro}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter">Dashboard Analítico</h1>
                            <p className="text-gray-500 text-sm font-medium">Dados de performance Agendei.vc</p>
                        </div>
                        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border shadow-sm">
                            <Calendar className="text-primary w-5 h-5 ml-2" />
                            <select
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-bold text-foreground cursor-pointer pr-4 h-[40px]"
                            >
                                <option value="dia">Hoje</option>
                                <option value="semana">Últimos 7 dias</option>
                                <option value="mes">Último Mês</option>
                                <option value="ano">Último Ano</option>
                            </select>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* 1. Ranking de Atendentes */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm lg:col-span-2">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <Scissors className="text-primary w-5 h-5" /> Atendimentos por Profissional
                            </h2>
                            {atendimentosPorFuncionario.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Nenhum atendimento no período</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    {atendimentosPorFuncionario.map((f, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs font-black uppercase tracking-tighter text-foreground">{f.nome}</span>
                                                <span className="text-xs font-black text-primary">{f.total} atendimentos</span>
                                            </div>
                                            <div className="h-3 bg-background border border-border rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-1000"
                                                    style={{ width: `${(f.total / maxFunc) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. Dias de Maior Movimento */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <BarChart3 className="text-primary w-5 h-5" /> Dias de Maior Movimento
                            </h2>
                            {fluxoDias.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Sem dados</p>
                            ) : (
                                <div className="flex h-48 w-full gap-2">
                                    <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 pb-6 border-r border-border/50 pr-2">
                                        <span>{maxDias}</span><span>{Math.round(maxDias / 2)}</span><span>0</span>
                                    </div>
                                    <div className="flex-1 flex items-end justify-between gap-2 px-1">
                                        {fluxoDias.map((d, i) => (
                                            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                                                <div className="text-[10px] font-black text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{d.total}</div>
                                                <div className="w-full flex items-end justify-center h-full max-h-[140px]">
                                                    <div className="w-full max-w-[30px] bg-primary/80 rounded-t-md transition-all hover:bg-primary" style={{ height: `${(d.total / maxDias) * 100}%`, minHeight: '2px' }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 mt-2">{d.dia}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Horários de Maior Fluxo */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <AlertCircle className="text-primary w-5 h-5" /> Horários de Maior Fluxo
                            </h2>
                            {fluxoHorarios.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Sem dados</p>
                            ) : (
                                <div className="flex h-48 w-full gap-2">
                                    <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 pb-6 border-r border-border/50 pr-2">
                                        <span>{maxHoras}</span><span>{Math.round(maxHoras / 2)}</span><span>0</span>
                                    </div>
                                    <div className="flex-1 flex items-end justify-between gap-2 px-1">
                                        {fluxoHorarios.map((h, i) => (
                                            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                                                <div className="text-[10px] font-black text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{h.total}</div>
                                                <div className="w-full flex items-end justify-center h-full max-h-[140px]">
                                                    <div className="w-full max-w-[25px] bg-primary rounded-t-md transition-all hover:brightness-110" style={{ height: `${(h.total / maxHoras) * 100}%`, minHeight: '2px' }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 mt-2">{h.hora}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Top 5 Clientes */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <TrendingUp className="text-primary w-5 h-5" /> Top 5 Clientes do Período
                            </h2>
                            {topClientes.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Nenhum cliente no período</p>
                            ) : (
                                <div className="space-y-3">
                                    {topClientes.map((c, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors">
                                            <span className="font-bold text-foreground">{c.nome}</span>
                                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">{c.total} cortes</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Recuperação de Clientes Sumidos */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Clientes Sumidos (+30 dias)
                            </h2>
                            {clientesAusentes.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Todos os clientes estão ativos</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {clientesAusentes.map((c, i) => (
                                        <div key={i} className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                                            <p className="font-bold text-sm text-foreground truncate">{c.nome}</p>
                                            <a
                                                href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=${encodeURIComponent("Olá! Notamos que já tem um mês que você não tira um tempinho pra cuidar de si mesmo com a gente. Quer agendar uma visita?")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 block text-center bg-white dark:bg-background text-red-500 py-1.5 rounded-lg text-[10px] font-black border border-red-200 hover:bg-red-500 hover:text-white transition-all uppercase"
                                            >
                                                Mensagem
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pode adicionar um card de receita futuramente */}
                    </div>
                </div>
            </main>
        </div>
    )
}