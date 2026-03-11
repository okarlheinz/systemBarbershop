'use client'
import { useEffect, useState, useCallback, useRef } from 'react' // Adicionei useRef
import { supabase } from '@/lib/supabase'
import { gerarSlotsDeHorario, aplicarMascaraWhatsapp } from '@/lib/utils'


export default function Home() {
  const [config, setConfig] = useState<any>(null)
  const [montado, setMontado] = useState(false)
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<string[]>([]);
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [dataSelecionada, setDataSelecionada] = useState(hoje)

  // --- ESTADOS PARA GESTÃO DE EQUIPE ---
  const [atendentes, setAtendentes] = useState<any[]>([])
  const [atendenteSelecionado, setAtendenteSelecionado] = useState<any>(null)
  const [multiAtendente, setMultiAtendente] = useState(false)

  // --- REF para armazenar o canal e garantir que ele persista ---
  const channelRef = useRef<any>(null);

  const diasSemanaMapa: { [key: number]: string } = {
    0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
  };

  const dataObjeto = new Date(dataSelecionada + 'T00:00:00');
  const nomeDiaSelecionado = diasSemanaMapa[dataObjeto.getDay()];
  const isDiaDeTrabalho = config?.dias_trabalho?.includes(nomeDiaSelecionado);



  // --- Função para carregar ocupação (useCallback para evitar recriações) ---
  const carregarOcupacao = useCallback(async () => {
    if (!dataSelecionada) return [];

    let query = supabase
      .from('agendamentos')
      .select('data_hora')
      .filter('data_hora', 'gte', `${dataSelecionada}T00:00:00`)
      .filter('data_hora', 'lte', `${dataSelecionada}T23:59:59`);

    if (multiAtendente && atendenteSelecionado) {
      query = query.eq('atendente_id', atendenteSelecionado.id);
    }

    const { data: agendamentosData } = await query;

    if (agendamentosData) {
      return agendamentosData.map(a => {
        const data = new Date(a.data_hora);
        return data.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
          hour12: false
        });
      });
    }
    return [];
  }, [dataSelecionada, atendenteSelecionado, multiAtendente]);

  useEffect(() => {
    async function carregarConfig() {
      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) {
        setConfig(configData);
        setMultiAtendente(configData.multi_atendente || false);
        document.documentElement.setAttribute('data-theme', configData.tema || 'light');

        if (configData.multi_atendente) {
          const { data: lista } = await supabase.from('atendentes').select('*').eq('ativo', true);
          setAtendentes(lista || []);
        }
      }
      setMontado(true);
    }
    carregarConfig();
  }, []);

  useEffect(() => {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length === 11) {
      const buscarCliente = async () => {
        const { data } = await supabase.from('clientes').select('nome').eq('telefone', telefoneLimpo).single();
        if (data && !nome) setNome(data.nome);
      };
      buscarCliente();
    }
  }, [telefone]);

  // --- VERSÃO CORRIGIDA: Realtime que realmente funciona ---
  useEffect(() => {
    let isSubscribed = true;

    const setupRealtime = async () => {
      if (!dataSelecionada) return;

      // Carregar dados iniciais
      const ocupacaoInicial = await carregarOcupacao();
      if (isSubscribed) {
        setAgendamentosDoDia(ocupacaoInicial);
      }

      // Remove canal anterior se existir
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Criar novo canal com configuração otimizada
      const channelName = `agendamentos-${dataSelecionada}-${atendenteSelecionado?.id || 'all'}`;

      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: '' }
        }
      });

      // Escutar mudanças na tabela agendamentos
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos',
            filter: `data_hora=gte.${dataSelecionada}T00:00:00Z`
          },
          async (payload) => {
            console.log('🔄 Mudança recebida:', payload);

            // Verificar se a mudança é relevante para o atendente selecionado
            if (multiAtendente && atendenteSelecionado) {
              const atendenteIdMudanca = (payload.new as any)?.atendente_id || (payload.old as any)?.atendente_id;
              if (atendenteIdMudanca !== atendenteSelecionado.id) {
                return; // Ignorar mudanças de outros atendentes
              }
            }

            // Recarregar horários
            const ocupacaoAtualizada = await carregarOcupacao();

            if (isSubscribed) {
              setAgendamentosDoDia(ocupacaoAtualizada);

              // Se o horário selecionado foi ocupado, limpar seleção
              if (horarioSelecionado && ocupacaoAtualizada.includes(horarioSelecionado)) {
                setHorarioSelecionado(null);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Status do canal:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Conectado ao canal:', channelName);
          } else if (status === 'CHANNEL_ERROR') {
            console.log('❌ Erro no canal, tentando reconectar...');
            // Tentar reconectar após 3 segundos
            setTimeout(() => {
              if (isSubscribed) {
                setupRealtime();
              }
            }, 3000);
          }
        });

      channelRef.current = channel;
    };

    setupRealtime();

    // Cleanup: cancelar subscription
    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [dataSelecionada, atendenteSelecionado, multiAtendente, carregarOcupacao, horarioSelecionado]);

  if (!montado || !config) return <div className="min-h-screen flex items-center justify-center bg-card text-foreground">Carregando...</div>

  const horariosDisponiveis = gerarSlotsDeHorario(config.horario_abertura, config.horario_fechamento, config.intervalo_minutos);
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dataHojeBrasilia = agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  const horariosFiltrados = horariosDisponiveis.filter((horario) => {
    if (dataSelecionada > dataHojeBrasilia) return true;
    if (dataSelecionada === dataHojeBrasilia) {
      const [hora, minuto] = horario.split(':').map(Number);
      const dataSlot = new Date();
      dataSlot.setHours(hora, minuto, 0, 0);
      return dataSlot > agora;
    }
    return false;
  });

  async function confirmarAgendamento() {
    if (!nome || !telefone || !horarioSelecionado) return alert("Preencha todos os campos!");
    if (multiAtendente && !atendenteSelecionado) return alert("Selecione um profissional!");

    setEnviando(true);
    try {
      const dataLocalIso = new Date(`${dataSelecionada}T${horarioSelecionado}:00`).toISOString();
      const telefoneLimpo = telefone.replace(/\D/g, '');

      // Salva cliente e agendamento no Supabase (código existente)
      const { data: cliente, error: errorCliente } = await supabase
        .from('clientes').upsert({ nome, telefone: telefoneLimpo }, { onConflict: 'telefone' }).select().single();

      if (errorCliente) throw errorCliente;

      const { error: errorAgendamento } = await supabase
        .from('agendamentos').insert([{
          cliente_id: cliente.id,
          nome_cliente: nome,
          telefone_cliente: telefoneLimpo,
          data_hora: dataLocalIso,
          atendente_id: atendenteSelecionado?.id
        }]);

      if (errorAgendamento) throw errorAgendamento;

      // --- NOVO: Enviar e-mail ---
      const { data: config } = await supabase
        .from('configuracoes')
        .select('email_notificacao')
        .single();
      const nomeAtendente = atendenteSelecionado?.nome || 'a equipe';
      const emailDestino = config?.email_notificacao || 'karlheinzkhar@gmail.com';
      const assunto = 'Novo agendamento realizado';
      const mensagem = `Olá!\n\nUm novo agendamento foi realizado:\n\n` +
        `Cliente: ${nome}\n` +
        `Telefone: ${telefone}\n` +
        `Atendente: ${nomeAtendente}\n` +
        `Data: ${dataSelecionada.split('-').reverse().join('/')}\n` +
        `Horário: ${horarioSelecionado}\n\n` +
        `Acesse o painel para mais detalhes.`;


      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatario: emailDestino,
          assunto,
          mensagem,
        }),
      }).catch(err => console.error('Erro ao enviar e-mail:', err)); // não quebra o fluxo se falhar

      // --- NOVO: Redirecionar para WhatsApp ---
      const dataFormatada = dataSelecionada.split('-').reverse().join('/');
      const numeroWhatsApp = '5581992957941'; // sem espaços ou caracteres especiais
      const textoWhatsApp = `Olá! Fiz um agendamento com o atendente ${nomeAtendente}, na data ${dataFormatada} e no horário ${horarioSelecionado}. Está confirmado?`;
      const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(textoWhatsApp)}`;
      window.open(urlWhatsApp, '_blank');

      alert("Agendamento realizado com sucesso!");

      // Limpar formulário após sucesso
      setHorarioSelecionado(null);
      setNome('');
      setTelefone('');

    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally { setEnviando(false); }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 bg-card transition-colors duration-300">
      <div className="bg-background p-6 md:p-8 rounded-2xl shadow-xl border border-border w-full max-w-lg">

        {config.logo_url && (
          <div className="flex justify-center mb-4">
            <img src={config.logo_url} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-sm" />
          </div>
        )}

        <h1 className="text-2xl font-black text-foreground mb-1 text-center uppercase tracking-tight">
          {config.nome_barbearia}
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8 font-medium">Agende seu horário em segundos</p>

        {/* --- SELEÇÃO DE PROFISSIONAL --- */}
        {multiAtendente && !atendenteSelecionado ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-4 text-center tracking-widest">
              Com quem deseja agendar?
            </label>
            <div className="grid grid-cols-1 gap-3">
              {atendentes.map(at => (
                <button
                  key={at.id}
                  onClick={() => setAtendenteSelecionado(at)}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary transition-all group active:scale-95"
                >
                  <img
                    src={at.foto_url || 'https://via.placeholder.com/150'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-sm"
                  />
                  <div className="text-left">
                    <p className="font-bold text-foreground group-hover:text-primary transition-colors">{at.nome}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Ver horários disponíveis</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {multiAtendente && atendenteSelecionado && (
              <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/10 mb-6 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <img src={atendenteSelecionado.foto_url} className="w-10 h-10 rounded-full object-cover" />
                  <p className="text-sm font-bold text-foreground">Agendando com <span className="text-primary">{atendenteSelecionado.nome}</span></p>
                </div>
                <button onClick={() => { setAtendenteSelecionado(null); setHorarioSelecionado(null) }} className="text-[10px] font-black text-primary uppercase underline hover:opacity-70">Trocar</button>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Escolha a data</label>
              <input
                type="date"
                value={dataSelecionada}
                min={hoje}
                onChange={(e) => { setDataSelecionada(e.target.value); setHorarioSelecionado(null); }}
                className="w-full bg-card p-4 border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-bold"
              />
            </div>

            {isDiaDeTrabalho ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {horariosFiltrados.map((horario) => {
                    const estaOcupado = agendamentosDoDia.includes(horario);
                    return (
                      <button
                        key={horario}
                        disabled={estaOcupado}
                        onClick={() => setHorarioSelecionado(horario)}
                        className={`py-3 rounded-xl font-bold transition-all border ${estaOcupado
                          ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                          : horarioSelecionado === horario
                            ? 'bg-primary text-white border-primary shadow-lg scale-105'
                            : 'bg-background text-foreground border-border hover:border-primary hover:scale-105'
                          }`}
                      >
                        {estaOcupado ? 'Ocupado' : horario}
                      </button>
                    );
                  })}
                </div>

                {horarioSelecionado && (
                  <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-card p-1 rounded-xl flex border border-border">
                      <div className="flex-1 text-center py-2 text-sm font-bold text-primary">
                        Horário: {horarioSelecionado}
                      </div>
                    </div>
                    <input
                      type="tel"
                      placeholder="Seu WhatsApp (DDD + Número)"
                      className="w-full p-4 bg-white border border-border rounded-xl text-black focus:ring-2 focus:ring-primary outline-none"
                      value={telefone}
                      onChange={(e) => setTelefone(aplicarMascaraWhatsapp(e.target.value))}
                    />
                    <input
                      type="text"
                      placeholder="Seu nome completo"
                      className="w-full p-4 bg-white border border-border rounded-xl text-black focus:ring-2 focus:ring-primary outline-none"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                    <button
                      onClick={confirmarAgendamento}
                      disabled={enviando}
                      className="w-full bg-green-600 text-white py-4 rounded-xl font-black hover:bg-green-700 transition-all shadow-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enviando ? 'Confirmando...' : 'Finalizar Agendamento'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 font-bold">Infelizmente não atendemos neste dia.</p>
                <p className="text-xs text-gray-400 mt-1">Por favor, escolha outra data acima.</p>
              </div>
            )}
          </>
        )}

        <div className="mt-10 pt-6 border-t border-border flex flex-col items-center">
          <h2 className="text-lg font-black text-foreground tracking-tighter uppercase italic opacity-50">Agendei.vc</h2>
          <p className="text-[9px] text-gray-400 font-bold tracking-widest">POWERED BY CODERX</p>
        </div>
      </div>
    </main>
  )
}