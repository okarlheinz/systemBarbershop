'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Calendar, Users, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react'

export default function Dashboard() {
    const [carregando, setCarregando] = useState(true)
    const [filtro, setFiltro] = useState('mes')
    const [topClientes, setTopClientes] = useState<any[]>([])
    const [fluxoHorarios, setFluxoHorarios] = useState<any[]>([])
    const [fluxoDias, setFluxoDias] = useState<any[]>([])
    const [clientesAusentes, setClientesAusentes] = useState<any[]>([])

    const diasSemanaMapa: { [key: number]: string } = {
        0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
    };

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
            const { inicio, fim } = getDatasFiltro()

            // 1. Busca configurações para saber os dias de atendimento
            const { data: config } = await supabase.from('configuracoes').select('dias_trabalho').single()
            const diasTrabalho = config?.dias_trabalho || []

            // 2. Busca agendamentos CONCLUÍDOS no período
            const { data: agendamentos } = await supabase
                .from('agendamentos')
                .select('nome_cliente, data_hora')
                .eq('status', 'concluido')
                .gte('data_hora', inicio)
                .lte('data_hora', fim)

            if (agendamentos) {
                // Ranking de Clientes
                const contagem: any = {}
                agendamentos.forEach(a => contagem[a.nome_cliente] = (contagem[a.nome_cliente] || 0) + 1)
                setTopClientes(Object.entries(contagem)
                    .map(([nome, total]) => ({ nome, total }))
                    .sort((a: any, b: any) => b.total - a.total).slice(0, 5))

                // Fluxo de Horários
                const contagemHoras: any = {}
                agendamentos.forEach(a => {
                    const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' }).split(':')[0]
                    contagemHoras[hora] = (contagemHoras[hora] || 0) + 1
                })
                setFluxoHorarios(Object.entries(contagemHoras)
                    .map(([hora, total]) => ({ hora: `${hora}h`, total: total as number }))
                    .sort((a, b) => a.hora.localeCompare(b.hora)))

                // Fluxo de Dias da Semana
                const contagemDias: any = {}
                agendamentos.forEach(a => {
                    const diaNome = diasSemanaMapa[new Date(a.data_hora).getDay()]
                    if (diasTrabalho.includes(diaNome)) {
                        contagemDias[diaNome] = (contagemDias[diaNome] || 0) + 1
                    }
                })
                setFluxoDias(diasTrabalho.map((dia: string) => ({
                    dia: dia.charAt(0).toUpperCase() + dia.slice(1, 3),
                    total: contagemDias[dia] || 0,
                    ordem: Object.values(diasSemanaMapa).indexOf(dia)
                })).sort((a: any, b: any) => a.ordem - b.ordem))
            }

            // 3. Clientes Ausentes (> 30 dias)
            const trintaDiasAtras = new Date()
            trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
            const { data: todosClientes } = await supabase.from('clientes').select('id, nome, telefone')
            const { data: ultimosAgendamentos } = await supabase.from('agendamentos').select('cliente_id, data_hora').order('data_hora', { ascending: false })

            if (todosClientes && ultimosAgendamentos) {
                setClientesAusentes(todosClientes.filter(cliente => {
                    const ultimo = ultimosAgendamentos.find(a => a.cliente_id === cliente.id)
                    return ultimo && new Date(ultimo.data_hora) < trintaDiasAtras
                }).slice(0, 6))
            }
            setCarregando(false)
        }
        carregarDados()
    }, [filtro])

    const maxHoras = Math.max(...fluxoHorarios.map(h => h.total), 1)
    const maxDias = Math.max(...fluxoDias.map(d => d.total), 1)

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-8 mt-12 lg:mt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter">Dashboard Analítico</h1>
                            <p className="text-gray-500 text-sm font-medium">Dados de performance Agendei.vc</p>
                        </div>
                        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border shadow-sm">
                            <Calendar className="text-primary w-5 h-5 ml-2" />
                            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-foreground cursor-pointer pr-4 h-[40px]">
                                <option value="dia">Hoje</option>
                                <option value="semana">Últimos 7 dias</option>
                                <option value="mes">Último Mês</option>
                                <option value="ano">Último Ano</option>
                            </select>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Dias de Maior Movimento */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <BarChart3 className="text-primary w-5 h-5" /> Dias de Maior Movimento
                            </h2>
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
                        </div>

                        {/* Horários de Maior Fluxo */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <AlertCircle className="text-primary w-5 h-5" /> Horários de Maior Fluxo
                            </h2>
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
                        </div>

                        {/* Ranking Clientes */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <TrendingUp className="text-primary w-5 h-5" /> Top 5 Clientes do Período
                            </h2>
                            <div className="space-y-3">
                                {topClientes.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors">
                                        <span className="font-bold text-foreground">{c.nome}</span>
                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">{c.total} cortes</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recuperação de Clientes */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Clientes Sumidos (+30 dias)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {clientesAusentes.map((c, i) => (
                                    <div key={i} className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                                        <p className="font-bold text-sm text-foreground truncate">{c.nome}</p>
                                        <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=${encodeURIComponent("Olá! Notamos que já tem um mês que você não tira um tempinho pra cuidar de si mesmo com a gente. Quer agendar uma visita?")}`} target="_blank" className="mt-2 block text-center bg-white dark:bg-background text-red-500 py-1.5 rounded-lg text-[10px] font-black border border-red-200 hover:bg-red-500 hover:text-white transition-all uppercase">Mensagem</a>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}