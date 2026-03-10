'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Calendar, Users, AlertCircle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
    const [carregando, setCarregando] = useState(true)
    const [filtro, setFiltro] = useState('mes') // dia, semana, mes, ano
    const [topClientes, setTopClientes] = useState<any[]>([])
    const [fluxoHorarios, setFluxoHorarios] = useState<any[]>([])
    const [clientesAusentes, setClientesAusentes] = useState<any[]>([])

    // Função para calcular as datas do filtro
    const getDatasFiltro = () => {
        const hoje = new Date()
        let inicio = new Date()

        if (filtro === 'dia') inicio.setHours(0, 0, 0, 0)
        else if (filtro === 'semana') inicio.setDate(hoje.getDate() - 7)
        else if (filtro === 'mes') inicio.setMonth(hoje.getMonth() - 1)
        else if (filtro === 'ano') inicio.setFullYear(hoje.getFullYear() - 1)

        return {
            inicio: inicio.toISOString(),
            fim: hoje.toISOString()
        }
    }

    useEffect(() => {
        async function carregarDados() {
            setCarregando(true)
            const { inicio, fim } = getDatasFiltro()

            // 1. Busca agendamentos CONCLUÍDOS no período para Top Clientes e Gráfico
            const { data: agendamentos } = await supabase
                .from('agendamentos')
                .select('nome_cliente, data_hora')
                .eq('status', 'concluido')
                .gte('data_hora', inicio)
                .lte('data_hora', fim)

            if (agendamentos) {
                // Ranking de Clientes (Baseado no Filtro)
                const contagem: any = {}
                agendamentos.forEach(a => contagem[a.nome_cliente] = (contagem[a.nome_cliente] || 0) + 1)
                setTopClientes(Object.entries(contagem)
                    .map(([nome, total]) => ({ nome, total }))
                    .sort((a: any, b: any) => b.total - a.total).slice(0, 5))

                // Fluxo de Horários (Baseado no Filtro)
                const contagemHoras: any = {}
                agendamentos.forEach(a => {
                    const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' }).split(':')[0]
                    contagemHoras[hora] = (contagemHoras[hora] || 0) + 1
                })
                setFluxoHorarios(Object.entries(contagemHoras)
                    .map(([hora, total]) => ({ hora: `${hora}h`, total }))
                    .sort((a, b) => a.hora.localeCompare(b.hora)))
            }

            // 2. Relatório de Clientes Ausentes (> 30 dias) - Independente do Filtro
            const trintaDiasAtras = new Date()
            trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

            const { data: todosClientes } = await supabase.from('clientes').select('id, nome, telefone')
            const { data: ultimosAgendamentos } = await supabase
                .from('agendamentos')
                .select('cliente_id, data_hora')
                .order('data_hora', { ascending: false })

            if (todosClientes && ultimosAgendamentos) {
                const ausentes = todosClientes.filter(cliente => {
                    const ultimo = ultimosAgendamentos.find(a => a.cliente_id === cliente.id)
                    if (!ultimo) return false
                    return new Date(ultimo.data_hora) < trintaDiasAtras
                }).slice(0, 5) // Mostra os 5 primeiros
                setClientesAusentes(ausentes)
            }

            setCarregando(false)
        }
        carregarDados()
    }, [filtro])

    const maxAtendimentos = Math.max(...fluxoHorarios.map(h => h.total), 1)

    return (
        <div className="flex min-h-screen bg-background transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">

                    {/* TOPO COM FILTRO DINÂMICO */}
                    <header className="mb-8 mt-12 lg:mt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-foreground">Dashboard Analítico</h1>
                            <p className="text-gray-500 text-sm">Dados inteligentes do Agendei.vc</p>
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

                        {/* RANKING DE CLIENTES (FILTRADO) */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <TrendingUp className="text-primary w-5 h-5" /> Top 5 Clientes do Período
                            </h2>
                            <div className="space-y-3">
                                {topClientes.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-background rounded-xl border border-border">
                                        <span className="font-bold text-foreground">{c.nome}</span>
                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">{c.total} atendimentos</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card: Gráfico de Horários de Pico */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                <AlertCircle className="text-primary w-5 h-5" /> Horários de Maior Fluxo
                            </h2>

                            <div className="flex h-48 w-full gap-2">
                                {/* EIXO VERTICAL (Quantidades) */}
                                <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 pb-6 border-r border-border/50 pr-2 mb-[-8px]">
                                    <span>{maxAtendimentos}</span>
                                    <span>{Math.round(maxAtendimentos / 2)}</span>
                                    <span>0</span>
                                </div>

                                {/* ÁREA DO GRÁFICO */}
                                <div className="flex-1 flex items-end justify-between gap-3 px-2">
                                    {fluxoHorarios.length > 0 ? fluxoHorarios.map((h, i) => (
                                        <div key={i} className="flex flex-col items-center flex-1 group h-full justify-end">
                                            {/* Número flutuante no hover */}
                                            <div className="text-[10px] font-black text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {h.total}
                                            </div>

                                            {/* A BARRA */}
                                            <div className="w-full flex items-end justify-center h-full max-h-[140px]">
                                                <div
                                                    className="w-full max-w-[25px] bg-primary rounded-t-md transition-all duration-500 hover:brightness-110 shadow-sm"
                                                    style={{
                                                        height: `${(h.total / maxAtendimentos) * 100}%`,
                                                        minHeight: '2px'
                                                    }}
                                                />
                                            </div>

                                            {/* Legenda da Hora */}
                                            <span className="text-[10px] font-bold text-gray-400 mt-2 mb-[-24px]">{h.hora}</span>
                                        </div>
                                    )) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-border rounded-xl">
                                            Sem dados no período
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* NOVO: CLIENTES SUMIDOS (FIXO > 30 DIAS) */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm lg:col-span-2">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 text-red-500">
                                <Users className="w-5 h-5" /> Recuperação de Clientes (Sumidos há +30 dias)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {clientesAusentes.map((c, i) => (
                                    <div key={i} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col justify-between">
                                        <div>
                                            <p className="font-bold text-foreground">{c.nome}</p>
                                            <p className="text-xs text-gray-500">{c.telefone}</p>
                                        </div>
                                        <a
                                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=${encodeURIComponent("Olá! Notamos que já tem um mês que você não tira um tempinho pra cuidar de si mesmo com a gente. Quer agendar uma visita?")}`}
                                            target="_blank"
                                            className="mt-3 text-center bg-white text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500"
                                        >
                                            Chamar no WhatsApp
                                        </a>
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