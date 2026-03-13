'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

interface Parametro {
    id: number;
    nome: string;
    descricao: string;
    ativo: number; 
}

export default function ParametrosPage() {
    const [parametros, setParametros] = useState<Parametro[]>([])
    const [busca, setBusca] = useState<string>('')
    const [filtroStatus, setFiltroStatus] = useState<string>('todos')
    const [carregando, setCarregando] = useState<boolean>(true)
    const router = useRouter()

    useEffect(() => {
        checkUser()
    }, [])

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push('/login')
            return
        }
        carregarParametros()
    }

    async function carregarParametros() {
        setCarregando(true)
        const { data, error } = await supabase
            .from('parametros')
            .select('*')
            .order('nome', { ascending: true })

        if (!error && data) {
            setParametros(data as Parametro[])
        }
        setCarregando(false)
    }

    const parametrosFiltrados = parametros.filter((p: Parametro) => {
        const correspondeBusca =
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.descricao.toLowerCase().includes(busca.toLowerCase())

        if (filtroStatus === 'ativos') return correspondeBusca && p.ativo === 1
        if (filtroStatus === 'inativos') return correspondeBusca && p.ativo === 0
        return correspondeBusca
    })

    async function alternarStatus(id: number, statusAtual: number) {
        const novoStatus = statusAtual === 1 ? 0 : 1
        const { error } = await supabase
            .from('parametros')
            .update({ ativo: novoStatus })
            .eq('id', id)

        if (!error) carregarParametros()
    }

    return (
        // Adicionado o container flex e bg-card para padronizar com as outras telas
        <div className="flex min-h-screen bg-card">
            <Sidebar />
            
            {/* Margem dinâmica para não ficar por baixo da sidebar no desktop e dar espaço ao menu no mobile */}
            <main className="flex-1 p-4 md:p-8 lg:ml-64 mt-16 lg:mt-0 transition-all">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-10 bg-background p-6 rounded-2xl shadow-sm border border-border">
                        <h1 className="text-3xl font-black text-black tracking-tighter uppercase italic">Configurações</h1>
                        <p className="text-gray-500 font-medium text-sm">Controle de Parâmetros e Funcionalidades</p>
                    </header>

                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black text-black"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                        <select
                            className="p-4 bg-white border border-gray-200 rounded-2xl outline-none font-bold text-sm text-black"
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                        >
                            <option value="todos">Todos os Status</option>
                            <option value="ativos">Ativos</option>
                            <option value="inativos">Inativos</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        {carregando ? (
                            <p className="text-center py-10 text-gray-400 font-bold italic">Carregando...</p>
                        ) : parametrosFiltrados.length > 0 ? (
                            parametrosFiltrados.map((param: Parametro) => (
                                <div key={param.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-md transition-all">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-lg tracking-tight text-black">{param.nome}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${param.ativo === 1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {param.ativo === 1 ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed">{param.descricao}</p>
                                    </div>

                                    {/* Botão ajustado com flex-shrink-0 para não esmagar */}
                                    <button
                                        onClick={() => alternarStatus(param.id, param.ativo)}
                                        className={`sm:w-auto w-full px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 flex-shrink-0 ${param.ativo === 1
                                                ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                                                : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'
                                            }`}
                                    >
                                        {param.ativo === 1 ? 'Desativar' : 'Ativar'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-bold italic">Nenhum parâmetro encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}