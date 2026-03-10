'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'

export default function Dashboard() {
    const [topClientes, setTopClientes] = useState<any[]>([])
    const [fluxoHorarios, setFluxoHorarios] = useState<any[]>([])
    const [carregando, setCarregando] = useState(true)



    useEffect(() => {
        async function carregarDados() {

            const { data: agendamentos } = await supabase
                .from('agendamentos')
                .select('nome_cliente, data_hora')
                .eq('status', 'concluido') // A mágica acontece aqui!

            if (agendamentos) {
                // --- Lógica: Ranking de Clientes ---
                const contagemClientes: any = {}
                agendamentos.forEach(a => {
                    contagemClientes[a.nome_cliente] = (contagemClientes[a.nome_cliente] || 0) + 1
                })

                const ranking = Object.entries(contagemClientes)
                    .map(([nome, total]) => ({ nome, total }))
                    .sort((a: any, b: any) => b.total - a.total)
                    .slice(0, 5)
                setTopClientes(ranking)

                // --- Lógica: Horários de Pico ---
                const contagemHoras: any = {}
                agendamentos.forEach(a => {
                    // Extrai a hora (ex: "14") considerando o fuso de Brasília
                    const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        timeZone: 'America/Sao_Paulo'
                    }).split(':')[0]
                    contagemHoras[hora] = (contagemHoras[hora] || 0) + 1
                })

                // Transforma em array e ordena por hora (08h, 09h...)
                const fluxo = Object.entries(contagemHoras)
                    .map(([hora, total]) => ({ hora: `${hora}h`, total }))
                    .sort((a, b) => a.hora.localeCompare(b.hora))

                setFluxoHorarios(fluxo)
            }
            setCarregando(false)
        }
        carregarDados()
    }, [])

    // Cálculo para a altura das barras do gráfico
    const maxAtendimentos = Math.max(...fluxoHorarios.map(h => h.total), 1)

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <header className="mb-8 mt-12 lg:mt-0">
                        <h1 className="text-2xl font-black text-foreground">Dashboard de Gestão</h1>
                        <p className="text-gray-500">Inteligência de dados da BarberSoft</p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Card: Clientes Fiéis */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                🏆 Top 5 Clientes
                            </h2>
                            <div className="space-y-3">
                                {topClientes.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-background rounded-xl border border-border hover:border-primary/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-gray-400">#{i + 1}</span>
                                            <span className="font-bold text-foreground">{c.nome}</span>
                                        </div>
                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">
                                            {c.total} cortes
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card: Gráfico de Horários de Pico */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                ⏰ Horários de Maior Fluxo
                            </h2>

                            <div className="flex items-end justify-between h-48 gap-3 px-2 border-b border-border/50">
                                {fluxoHorarios.length > 0 ? fluxoHorarios.map((h, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 group h-full justify-end">
                                        {/* Número acima da barra */}
                                        <div className="text-[10px] font-black text-primary mb-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h.total}
                                        </div>

                                        {/* A BARRA - Adicionamos h-full e mudamos o cálculo para garantir visibilidade */}
                                        <div className="w-full flex items-end justify-center h-full">
                                            <div
                                                className="w-full max-w-[30px] bg-primary rounded-t-md transition-all duration-700 ease-out hover:brightness-110 shadow-sm"
                                                style={{
                                                    height: `${(h.total / maxAtendimentos) * 100}%`,
                                                    minHeight: '4px' // Garante que até o "0" apareça um risquinho
                                                }}
                                            />
                                        </div>

                                        {/* Legenda da Hora */}
                                        <span className="text-[10px] font-bold text-gray-400 mt-2 mb-[-24px]">{h.hora}</span>
                                    </div>
                                )) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-border rounded-xl">
                                        Aguardando dados...
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}