'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation' // <--- Importe o roteador

export default function ParametrosPage() {
    const [parametros, setParametros] = useState([])
    const [busca, setBusca] = useState('')
    const [filtroStatus, setFiltroStatus] = useState('todos')
    const [carregando, setCarregando] = useState(true)
    const router = useRouter() // <--- Inicialize o roteador

    useEffect(() => {
        checkUser()
    }, [])

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession()

        // Se não tiver sessão (não está logado), manda para o login
        if (!session) {
            router.push('/login') // Ou a rota exata da sua tela de login
            return
        }

        // Se estiver logado, carrega os parâmetros normalmente
        carregarParametros()
    }

    async function carregarParametros() {
        setCarregando(true)
        const { data, error } = await supabase
            .from('parametros')
            .select('*')
            .order('nome', { ascending: true })

        if (!error) setParametros(data)
        setCarregando(false)
    }

    // Lógica de Filtro em tempo real
    const parametrosFiltrados = parametros.filter(p => {
        const correspondeBusca =
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.descricao.toLowerCase().includes(busca.toLowerCase())

        if (filtroStatus === 'ativos') return correspondeBusca && p.ativo === 1
        if (filtroStatus === 'inativos') return correspondeBusca && p.ativo === 0
        return correspondeBusca
    })

    async function alternarStatus(id, statusAtual) {
        const novoStatus = statusAtual === 1 ? 0 : 1
        const { error } = await supabase
            .from('parametros')
            .update({ ativo: novoStatus })
            .eq('id', id)

        if (!error) carregarParametros()
    }

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-12">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-black text-black tracking-tighter uppercase italic">Configurações de Sistema</h1>
                    <p className="text-gray-500 font-medium">Controle de Parâmetros e Funcionalidades</p>
                </header>

                {/* --- BARRA DE BUSCA E FILTROS --- */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou descrição..."
                        className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                    <select
                        className="p-4 bg-white border border-gray-200 rounded-2xl outline-none font-bold text-sm"
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                    >
                        <option value="todos">Todos os Status</option>
                        <option value="ativos">Apenas Ativos</option>
                        <option value="inativos">Apenas Inativos</option>
                    </select>
                </div>

                {/* --- LISTAGEM --- */}
                <div className="space-y-4">
                    {carregando ? (
                        <p className="text-center py-10 text-gray-400 font-bold">Carregando parâmetros...</p>
                    ) : parametrosFiltrados.length > 0 ? (
                        parametrosFiltrados.map(param => (
                            <div key={param.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-black text-lg tracking-tight">{param.nome}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${param.ativo === 1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {param.ativo === 1 ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{param.descricao}</p>
                                </div>

                                <button
                                    onClick={() => alternarStatus(param.id, param.ativo)}
                                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 ${param.ativo === 1
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

                <footer className="mt-12 text-center">
                    <p className="text-[10px] font-black text-gray-300 tracking-[0.3em] uppercase">Agendei.tu - Parâmetros Internos</p>
                </footer>
            </div>
        </main>
    )
}