'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Camera } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext';

export default function Configuracoes() {
    const [loading, setLoading] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [uploading, setUploading] = useState(false)
    const { theme, setTheme } = useTheme();

    const [form, setForm] = useState({
        nome_barbearia: '',
        horario_abertura: '',
        horario_fechamento: '',
        intervalo_minutos: 30,
        logo_url: '',
        email_notificacao: '', // ADICIONE ESTA LINHA
        dias_trabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'] as string[]
    })

    const temas = [
        { id: 'light', cor: 'bg-white border-gray-300' },
        { id: 'dark', cor: 'bg-slate-900 border-slate-700' },
        { id: 'rosa', cor: 'bg-pink-200 border-pink-300' },
    ];

    const toggleDia = (dia: string) => {
        const novosDias = form.dias_trabalho.includes(dia)
            ? form.dias_trabalho.filter(d => d !== dia)
            : [...form.dias_trabalho, dia];
        setForm({ ...form, dias_trabalho: novosDias });
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) return
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`
            const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath)
            setForm({ ...form, logo_url: publicUrl })
            alert("Logo carregada!")
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
                    nome_barbearia: data.nome_barbearia || '',
                    horario_abertura: data.horario_abertura || '',
                    horario_fechamento: data.horario_fechamento || '',
                    intervalo_minutos: data.intervalo_minutos || 30,
                    logo_url: data.logo_url || '',
                    email_notificacao: data.email_notificacao || '',
                    dias_trabalho: data.dias_trabalho || ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
                })
                if (data.tema) setTheme(data.tema)
            }
            setLoading(false)
        }
        carregarConfig()
    }, [setTheme])

    async function salvar(e: React.FormEvent) {
        e.preventDefault()
        setSalvando(true)
        const { data: configAtual } = await supabase.from('configuracoes').select('id').single()
        const { error } = await supabase
            .from('configuracoes')
            .update({ ...form, tema: theme })
            .eq('id', configAtual?.id)
        setSalvando(false)
        if (!error) alert("Configurações salvas!");
        else alert("Erro ao salvar.");
    }

    // Classe padrão para todos os inputs ficarem iguais
    const inputStyle = "w-full bg-white px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black h-[50px] leading-[50px] appearance-none m-0";

    if (loading) return <div className="p-10 text-foreground">Carregando...</div>

    return (
        <div className="flex bg-card min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-2xl md:text-3xl font-black mb-8 text-foreground text-center md:text-left">Configuração do Sistema</h1>

                    <form onSubmit={salvar} className="bg-background p-6 md:p-8 rounded-2xl shadow-sm border border-border space-y-6">

                        <div className="flex flex-col items-center mb-6">
                            <label className="block text-sm font-bold text-foreground mb-4 text-center w-full">Logo da Empresa</label>
                            <div className="relative group w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-black transition-colors">
                                {form.logo_url ? <img src={form.logo_url} className="w-full h-full object-cover" alt="Logo" /> : <Camera className="text-gray-400" />}
                                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>

                            <div className="mt-6 flex flex-col items-center">
                                <label className="text-sm font-medium mb-3 block text-foreground">Tema do Sistema</label>
                                <div className="flex gap-4">
                                    {temas.map((t) => (
                                        <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`w-10 h-10 rounded-full border-2 transition-all ${t.cor} ${theme === t.id ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'opacity-70'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Nome da Empresa</label>
                            <input
                                type="text"
                                value={form.nome_barbearia}
                                onChange={e => setForm({ ...form, nome_barbearia: e.target.value })}
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">E-mail para Notificações</label>
                            <input
                                type="email"
                                placeholder="ex: contato@barbearia.com"
                                value={form.email_notificacao}
                                onChange={e => setForm({ ...form, email_notificacao: e.target.value })}
                                className={inputStyle}
                            />
                            <p className="text-xs text-gray-500 mt-1">Este e-mail receberá os avisos de novos agendamentos.</p>
                        </div>

                        {/* Aqui foi onde o ajuste de altura foi aplicado */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full">
                                <label className="block text-sm font-bold text-foreground mb-2">Abertura</label>
                                <input
                                    type="time"
                                    value={form.horario_abertura}
                                    onChange={e => setForm({ ...form, horario_abertura: e.target.value })}
                                    className={`${inputStyle} py-0 min-h-[50px] max-h-[50px]`}
                                    style={{ height: '50px' }} // Reforço inline para garantir em todos os browsers
                                />
                            </div>
                            <div className="w-full">
                                <label className="block text-sm font-bold text-foreground mb-2">Fechamento</label>
                                <input
                                    type="time"
                                    value={form.horario_fechamento}
                                    onChange={e => setForm({ ...form, horario_fechamento: e.target.value })}
                                    className={`${inputStyle} py-0 min-h-[50px] max-h-[50px]`}
                                    style={{ height: '50px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-3">Dias de Atendimento</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map((dia) => (
                                    <button
                                        key={dia}
                                        type="button"
                                        onClick={() => toggleDia(dia)}
                                        className={`p-2 text-xs font-bold rounded-lg border transition-all h-[45px] ${form.dias_trabalho.includes(dia) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-200'}`}
                                    >
                                        {dia.charAt(0).toUpperCase() + dia.slice(1, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Intervalo entre Atendimentos (minutos)</label>
                            <select
                                value={form.intervalo_minutos}
                                onChange={e => setForm({ ...form, intervalo_minutos: Number(e.target.value) })}
                                className={inputStyle}
                            >
                                <option value={15}>15 minutos</option>
                                <option value={30}>30 minutos</option>
                                <option value={45}>45 minutos</option>
                                <option value={60}>1 hora</option>
                            </select>
                        </div>

                        <button disabled={salvando} className="w-full bg-foreground text-white p-4 rounded-xl font-bold h-[60px]">
                            {salvando ? "Salvando..." : "Salvar Alterações"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}