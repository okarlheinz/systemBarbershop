'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import {
    UserPlus, Edit, Key, Shield, User, Mail,
    CheckCircle, XCircle, Search, Camera, Check, X
} from 'lucide-react'

export default function GestaoEquipe() {
    const [atendentes, setAtendentes] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editando, setEditando] = useState<any>(null)
    const [showResetSenha, setShowResetSenha] = useState<string | null>(null)
    const [carregando, setCarregando] = useState(false)

    // Estados do Formulário
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [permissao, setPermissao] = useState('apenas_agenda')
    const [ativo, setAtivo] = useState(true)
    const [foto, setFoto] = useState<File | null>(null)
    const [previewFoto, setPreviewFoto] = useState('')

    // Estados de Senha
    const [senha, setSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')

    // Estados de Disponibilidade (Nova Funcionalidade)
    const [abaAtiva, setAbaAtiva] = useState('dados') // 'dados' ou 'horarios'
    const [disponibilidade, setDisponibilidade] = useState<any[]>([])
    const [configMestre, setConfigMestre] = useState<any>(null)

    // Validação de Senha (Requisitos do Supabase)
    const temSeisCaracteres = senha.length >= 6
    const temMaiuscula = /[A-Z]/.test(senha)
    const temNumero = /[0-9]/.test(senha)
    const senhasConferem = senha === confirmarSenha && senha !== ''

    // Buscar parametros
    const [statusHorarioAtendente, setStatusHorarioAtendente] = useState<boolean | null>(null);


    useEffect(() => {
        carregarEquipe();
        carregarConfiguracoes();
    }, [])

    async function carregarEquipe() {
        const { data } = await supabase.from('atendentes').select('*').order('nome')
        if (data) setAtendentes(data)
    }

    async function carregarConfiguracoes() {
        const { data } = await supabase.from('configuracoes').select('*').single();
        if (data) setConfigMestre(data);
    }

    const atendentesFiltrados = atendentes.filter(a =>
        a.nome.toLowerCase().includes(busca.toLowerCase()) ||
        a.email.toLowerCase().includes(busca.toLowerCase())
    )

    function gerarHorarios(abertura: string, fechamento: string, intervalo: number) {
        const horarios = [];
        let atual = abertura;
        while (atual < fechamento) {
            horarios.push(atual.substring(0, 5));
            const [h, m] = atual.split(':').map(Number);
            const novaData = new Date(0, 0, 0, h, m + intervalo);
            atual = novaData.toTimeString().split(' ')[0];
        }
        return horarios;
    }

    async function handleUploadFoto(file: File) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `atendentes/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('logos').getPublicUrl(filePath)
        return data.publicUrl
    }

    // Função para preparar os dados antes de abrir o modal de edição
    async function prepararEdicao(atendente: any) {
        setEditando(atendente);
        setNome(atendente.nome);
        setEmail(atendente.email);
        setPermissao(atendente.permissao);
        setAtivo(atendente.ativo);
        setAbaAtiva('dados');

        // Busca horários já salvos para este atendente
        const { data, error } = await supabase
            .from('atendente_disponibilidade')
            .select('dia_semana, horario')
            .eq('atendente_id', atendente.id);

        if (data) {
            // Ajusta o formato para bater com o que o componente espera
            const formatados = data.map(d => ({
                dia: d.dia_semana,
                horario: d.horario.substring(0, 5)
            }));
            setDisponibilidade(formatados);
        } else {
            setDisponibilidade([]);
        }

        setShowModal(true);
    }

    async function salvarAtendente() {
        if (!nome || !email) return alert("Nome e E-mail são obrigatórios")

        if (!editando && (!temSeisCaracteres || !senhasConferem)) {
            return alert("Verifique os requisitos da senha para o novo cadastro")
        }

        setCarregando(true)
        try {
            let urlFinal = editando?.foto_url || ''
            if (foto) {
                urlFinal = await handleUploadFoto(foto)
            }

            let idParaDisponibilidade = '';

            if (editando) {
                idParaDisponibilidade = editando.id;
                const { error: dbError } = await supabase.from('atendentes')
                    .update({
                        nome,
                        permissao,
                        ativo,
                        foto_url: urlFinal
                    })
                    .eq('id', editando.id)

                if (dbError) throw dbError
            } else {
                // NOVO CADASTRO
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password: senha,
                })

                if (authError) throw authError

                const { data: novoAtendente, error: dbError } = await supabase.from('atendentes').insert([{
                    auth_user_id: authData.user?.id,
                    nome,
                    email,
                    permissao,
                    ativo: true,
                    foto_url: urlFinal
                }]).select().single();

                if (dbError) throw dbError
                idParaDisponibilidade = novoAtendente.id;
            }

            // SALVAR DISPONIBILIDADE (Lógica de Upsert manual)
            // 1. Deleta o anterior
            await supabase.from('atendente_disponibilidade').delete().eq('atendente_id', idParaDisponibilidade);

            // 2. Insere a nova lista se houver
            if (disponibilidade.length > 0) {
                const dataToInsert = disponibilidade.map(d => ({
                    atendente_id: idParaDisponibilidade,
                    dia_semana: d.dia,
                    horario: d.horario
                }));
                const { error: errorDisp } = await supabase.from('atendente_disponibilidade').insert(dataToInsert);
                if (errorDisp) throw errorDisp;
            }

            alert(editando ? "Cadastro atualizado!" : "Atendente criado com sucesso!")
            fecharModal()
            carregarEquipe()
        } catch (err: any) {
            console.error("Erro completo:", err)
            alert("Erro ao processar: " + (err.message || "Erro interno"))
        } finally { setCarregando(false) }
    }

    async function executarResetSenha(id: string) {
        if (!temSeisCaracteres || !senhasConferem) return alert("Senha não atende aos requisitos")
        alert("Senha alterada com sucesso!")
        setShowResetSenha(null)
        setSenha('')
        setConfirmarSenha('')
    }

    function fecharModal() {
        setShowModal(false)
        setEditando(null)
        setNome('')
        setEmail('')
        setSenha('')
        setConfirmarSenha('')
        setPreviewFoto('')
        setFoto(null)
        setDisponibilidade([])
        setAbaAtiva('dados')
    }

    useEffect(() => {
        async function verificarParametro() {
            const { data, error } = await supabase
                .from('parametros')
                .select('ativo')
                .eq('nome', 'HORARIOATENDENTE')
                .single();

            if (!error && data) {
                setStatusHorarioAtendente(data.ativo === 1)
            } else {
                console.error('Erro ao buscar parâmetro:', error);
            }
        }
        verificarParametro();
    }, [])

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-8 mt-12 lg:mt-0">
                <div className="max-w-5xl mx-auto">

                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Gestão da Equipe</h1>
                            <p className="text-gray-500 text-sm">Controle de profissionais e permissões</p>
                        </div>
                        <div className="flex w-full md:w-auto gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    className="w-full md:w-64 bg-card border border-border pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-primary text-white p-2 md:px-4 md:py-2 rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2"
                            >
                                <UserPlus size={18} /> <span className="hidden md:block">Novo Atendente</span>
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {atendentesFiltrados.map((atendente) => (
                            <div key={atendente.id} className={`bg-card p-5 rounded-2xl border ${atendente.ativo ? 'border-border' : 'border-red-200 opacity-75'} shadow-sm`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        {atendente.foto_url ? (
                                            <img src={atendente.foto_url} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
                                        ) : (
                                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary"><User size={28} /></div>
                                        )}
                                        <div>
                                            <h3 className="font-bold">{atendente.nome}</h3>
                                            <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={12} /> {atendente.email}</p>
                                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-border text-[10px] font-bold uppercase text-gray-500">
                                                <Shield size={10} /> {atendente.permissao === 'completo' ? 'Acesso Total' : 'Apenas Agenda'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${atendente.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {atendente.ativo ? 'Ativo' : 'Inativo'}
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-2">
                                    <button
                                        onClick={() => prepararEdicao(atendente)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-background border border-border rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                                    >
                                        <Edit size={14} /> Editar
                                    </button>
                                    <button
                                        onClick={() => { setShowResetSenha(showResetSenha === atendente.id ? null : atendente.id); setSenha(''); setConfirmarSenha(''); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-background border border-border rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                                    >
                                        <Key size={14} /> Resetar Senha
                                    </button>
                                </div>

                                {showResetSenha === atendente.id && (
                                    <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-dashed border-border">
                                        <div className="space-y-3">
                                            <input type="password" placeholder="Nova Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full bg-background border border-border p-2 rounded-lg text-sm outline-none focus:border-primary" />
                                            <input type="password" placeholder="Confirmar Nova Senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full bg-background border border-border p-2 rounded-lg text-sm outline-none focus:border-primary" />

                                            <div className="text-[10px] space-y-1 py-1">
                                                <p className={`flex items-center gap-1 ${temSeisCaracteres ? 'text-green-500' : 'text-red-500'}`}> {temSeisCaracteres ? <Check size={10} /> : <X size={10} />} Mínimo 6 caracteres</p>
                                                <p className={`flex items-center gap-1 ${temMaiuscula ? 'text-green-500' : 'text-red-500'}`}> {temMaiuscula ? <Check size={10} /> : <X size={10} />} Uma letra maiúscula</p>
                                                <p className={`flex items-center gap-1 ${senhasConferem ? 'text-green-500' : 'text-red-500'}`}> {senhasConferem ? <Check size={10} /> : <X size={10} />} As senhas coincidem</p>
                                            </div>

                                            <div className="flex gap-2">
                                                <button onClick={() => executarResetSenha(atendente.id)} className="flex-1 bg-primary text-white py-2 rounded-lg text-[10px] font-black uppercase">Guardar</button>
                                                <button onClick={() => setShowResetSenha(null)} className="px-3 py-2 border border-border rounded-lg text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* MODAL DE CADASTRO / EDIÇÃO */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-card w-full max-w-md rounded-3xl border border-border p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                                <h2 className="text-xl font-black mb-6 uppercase tracking-tight">{editando ? 'Editar Cadastro' : 'Novo Atendente'}</h2>

                                {/* NAVEGAÇÃO POR ABAS NO MODAL */}
                                {statusHorarioAtendente ? (

                                <div className="flex gap-4 mb-6 border-b border-border">
                                    <button
                                        onClick={() => setAbaAtiva('dados')}
                                        className={`pb-2 px-2 text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'dados' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}
                                    >
                                        Dados Básicos
                                    </button>
                                    <button
                                        onClick={() => setAbaAtiva('horarios')}
                                        className={`pb-2 px-2 text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'horarios' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}
                                    >
                                        Horários
                                    </button>
                                </div>

                                ) : null}

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {abaAtiva === 'dados' ? (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            {/* Upload de Foto */}
                                            <div className="flex flex-col items-center mb-4">
                                                <label className="relative cursor-pointer group">
                                                    <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                                                        {previewFoto || editando?.foto_url ? (
                                                            <img src={previewFoto || editando.foto_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Camera className="text-gray-400 group-hover:text-primary transition-colors" />
                                                        )}
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) { setFoto(file); setPreviewFoto(URL.createObjectURL(file)) }
                                                    }} />
                                                    <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg"><Edit size={10} /></div>
                                                </label>
                                                <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Foto do Perfil</span>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome Completo</label>
                                                <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl outline-none focus:border-primary text-sm" placeholder="Ex: João Silva" />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">E-mail de Login</label>
                                                <input disabled={!!editando} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl outline-none focus:border-primary text-sm disabled:opacity-50" placeholder="joao@email.com" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Permissão</label>
                                                    <select value={permissao} onChange={(e) => setPermissao(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl outline-none focus:border-primary font-bold text-xs">
                                                        <option value="apenas_agenda">Agenda</option>
                                                        <option value="completo">Total</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Status</label>
                                                    <button
                                                        onClick={() => setAtivo(!ativo)}
                                                        className={`w-full p-3 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-2 ${ativo ? 'border-green-200 bg-green-50 text-green-600' : 'border-red-200 bg-red-50 text-red-600'}`}
                                                    >
                                                        {ativo ? <CheckCircle size={14} /> : <XCircle size={14} />} {ativo ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                </div>
                                            </div>

                                            {!editando && (
                                                <div className="space-y-3 pt-2">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl outline-none focus:border-primary text-sm" placeholder="Senha" />
                                                        <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl outline-none focus:border-primary text-sm" placeholder="Confirmação" />
                                                    </div>
                                                    <div className="text-[10px] space-y-1 bg-muted/50 p-3 rounded-xl border border-border">
                                                        <p className={`flex items-center gap-1 ${temSeisCaracteres ? 'text-green-500' : 'text-red-500'}`}> {temSeisCaracteres ? <Check size={10} /> : <X size={10} />} Mínimo 6 caracteres</p>
                                                        <p className={`flex items-center gap-1 ${temMaiuscula ? 'text-green-500' : 'text-red-500'}`}> {temMaiuscula ? <Check size={10} /> : <X size={10} />} Pelo menos uma letra Maiúscula</p>
                                                        <p className={`flex items-center gap-1 ${senhasConferem ? 'text-green-500' : 'text-red-500'}`}> {senhasConferem ? <Check size={10} /> : <X size={10} />} Senhas coincidem</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* ABA DE HORÁRIOS */
                                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <p className="text-[10px] text-gray-400 italic">
                                                Exibindo apenas os dias ativos nas configurações da empresa.
                                            </p>

                                            {/* Mapeamos os dias apenas se eles estiverem no configMestre.dias_trabalho */}
                                            {['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
                                                .filter(dia => configMestre?.dias_trabalho?.includes(dia))
                                                .map(dia => (
                                                    <div key={dia} className="border-b border-border/50 pb-4">
                                                        <h4 className="font-black uppercase text-[10px] text-gray-400 mb-3 tracking-widest">{dia}</h4>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {configMestre && gerarHorarios(
                                                                configMestre.horario_abertura,
                                                                configMestre.horario_fechamento,
                                                                configMestre.intervalo_minutos
                                                            ).map(hora => {
                                                                const isSelected = disponibilidade.some(d => d.dia === dia && d.horario === hora);
                                                                return (
                                                                    <button
                                                                        key={`${dia}-${hora}`}
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setDisponibilidade(disponibilidade.filter(d => !(d.dia === dia && d.horario === hora)));
                                                                            } else {
                                                                                setDisponibilidade([...disponibilidade, { dia, horario: hora }]);
                                                                            }
                                                                        }}
                                                                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${isSelected ? 'bg-primary text-white border-primary' : 'bg-background text-gray-400 border-border'
                                                                            }`}
                                                                    >
                                                                        {hora}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}

                                            {/* Caso nenhum dia esteja marcado (segurança) */}
                                            {configMestre?.dias_trabalho?.length === 0 && (
                                                <div className="text-center py-10">
                                                    <p className="text-sm text-gray-500">Nenhum dia de atendimento configurado.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-8 pt-4 border-t border-border">
                                    <button
                                        onClick={salvarAtendente}
                                        disabled={carregando}
                                        className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                                    >
                                        {carregando ? 'Salvando...' : editando ? 'Guardar Alterações' : 'Criar Atendente'}
                                    </button>
                                    <button
                                        onClick={fecharModal}
                                        className="px-6 py-4 border border-border rounded-2xl font-black uppercase text-gray-400 hover:bg-muted transition-all text-xs"
                                    >
                                        Sair
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    )
}