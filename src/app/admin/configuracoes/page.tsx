'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Camera } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext';

export default function Configuracoes() {
    const [loading, setLoading] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [form, setForm] = useState({
        nome_barbearia: '',
        horario_abertura: '',
        horario_fechamento: '',
        intervalo_minutos: 30,
        logo_url: ''
    })
    const [uploading, setUploading] = useState(false)
    const { theme, setTheme } = useTheme();

    const temas = [
        { id: 'light', cor: 'bg-white border-gray-300' },
        { id: 'dark', cor: 'bg-slate-900 border-slate-700' },
        { id: 'rosa', cor: 'bg-pink-200 border-pink-300' },
    ];

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) return

            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}` // Nome aleatório para evitar cache
            const filePath = `${fileName}`

            // 1. Upload para o Storage
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Gerar URL Pública
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath)

            // 3. Atualizar o estado do formulário
            setForm({ ...form, logo_url: publicUrl })
            alert("Logo carregada! Não esqueça de salvar as alterações.")

        } catch (error) {
            alert('Erro no upload!')
        } finally {
            setUploading(false)
        }
    }


    useEffect(() => {
        async function carregarConfig() {
            const { data } = await supabase.from('configuracoes').select('*').single()
            if (data) {
                setForm({
                    nome_barbearia: data.nome_barbearia,
                    horario_abertura: data.horario_abertura,
                    horario_fechamento: data.horario_fechamento,
                    intervalo_minutos: data.intervalo_minutos,
                    logo_url: data.logo_url
                })
            }
            setLoading(false)
        }
        carregarConfig()
    }, [])

    async function salvar(e: React.FormEvent) {
        e.preventDefault()
        setSalvando(true)
        const { error } = await supabase
            .from('configuracoes')
            .update(form)
            .eq('id', (await supabase.from('configuracoes').select('id').single()).data?.id)

        setSalvando(false)
        if (!error) alert("Configurações salvas com sucesso!")
    }

    if (loading) return <div className="p-10">Carregando...</div>

    return (
        <div className="flex bg-background min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-black mb-8 text-foreground">Configuração do Sistema</h1>

                    <form onSubmit={salvar} className="bg-background p-8 rounded-2xl shadow-sm border border-border space-y-6">                        <div>
                        <div className="flex flex-col items-center mb-6">
                            <label className="block text-sm font-bold text-foreground mb-4 text-center w-full">Logo da Barbearia</label>
                            <div className="relative group w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-black transition-colors">
                                {form.logo_url ? (
                                    <img src={form.logo_url} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                    <Camera className="text-gray-400" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{uploading ? 'Enviando...' : 'Clique para trocar a imagem'}</p>

                            {/* ESCOLHA DE TEMA */}
                            <div className="mt-6">
                                <label className="text-sm font-medium mb-2 block text-foreground">Tema do Sistema</label>
                                <div className="flex gap-4">
                                    {temas.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTheme(t.id)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${t.cor} ${theme === t.id ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                                                }`}
                                            title={t.id}
                                        />
                                    ))}
                                </div>
                            </div>
                            {/* FIM DA ESCOLHA DE TEMA */}
                        </div>
                        <label className="block text-sm font-bold text-foreground mb-2">Nome da Barbearia</label>
                        <input
                            type="text"
                            value={form.nome_barbearia}
                            onChange={e => setForm({ ...form, nome_barbearia: e.target.value })}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                        />
                    </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Abertura</label>
                                <input
                                    type="time"
                                    value={form.horario_abertura}
                                    onChange={e => setForm({ ...form, horario_abertura: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Fechamento</label>
                                <input
                                    type="time"
                                    value={form.horario_fechamento}
                                    onChange={e => setForm({ ...form, horario_fechamento: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Intervalo entre Atendimentos (minutos)</label>
                            <select
                                value={form.intervalo_minutos}
                                onChange={e => setForm({ ...form, intervalo_minutos: Number(e.target.value) })}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                            >
                                <option value={15}>15 minutos</option>
                                <option value={30}>30 minutos</option>
                                <option value={45}>45 minutos</option>
                                <option value={60}>1 hora</option>
                            </select>
                        </div>

                        <button
                            disabled={salvando}
                            className="w-full bg-black text-white p-4 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:bg-gray-400"
                        >
                            {salvando ? "Salvando..." : "Salvar Alterações"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}