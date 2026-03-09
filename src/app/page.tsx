'use client' // Indica que este componente roda no navegador do usuário
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gerarSlotsDeHorario } from '@/lib/utils'
import { aplicarMascaraWhatsapp } from '@/lib/utils'
import Image from 'next/image'

export default function Home() {
  const [config, setConfig] = useState<any>(null)
  const [montado, setMontado] = useState(false)
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<string[]>([]);
  const hoje = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Sao_Paulo'
  })

  const [dataSelecionada, setDataSelecionada] = useState(hoje)

  async function confirmarAgendamento() {
    if (!nome || !telefone || !horarioSelecionado) {
      alert("Preencha todos os campos!");
      return;
    }

    setEnviando(true);

    const dataLocal = new Date(`${dataSelecionada}T${horarioSelecionado}:00`)
    const dataLocalIso = dataLocal.toISOString()

    const telefoneLimpo = telefone.replace(/\D/g, ''); // Remove ( ) - e espaços

    const { error } = await supabase
      .from('agendamentos')
      .insert([{
        nome_cliente: nome,
        telefone_cliente: telefoneLimpo, // Salva apenas os 11 números
        data_hora: dataLocalIso
      }]);

    setEnviando(false);

    if (error) {

      if (error.code === "23505") {
        alert("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.");
        window.location.reload();
        return;
      }

      alert("Erro ao agendar: " + error.message);
    } else {
      alert("Agendamento realizado com sucesso!");
      setNome('');
      setTelefone('');
      setHorarioSelecionado(null);
      // Recarregar a página ou os dados aqui seria ideal
      window.location.reload();
    }
  }

  useEffect(() => {
    setMontado(true);
    async function carregarDados() {
      // Busca configurações (fixo)
      const { data: configData } = await supabase.from('configuracoes').select('*').single();
      if (configData) setConfig(configData);

      // Busca agendamentos baseados na DATA SELECIONADA
      const { data: agendamentosData } = await supabase
        .from('agendamentos')
        .select('data_hora')
        .filter('data_hora', 'gte', `${dataSelecionada}T00:00:00Z`)
        .filter('data_hora', 'lte', `${dataSelecionada}T23:59:59Z`);

      if (agendamentosData) {
        const horasOcupadas = agendamentosData.map(a => {

          const data = new Date(a.data_hora)

          return data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
          })

        })
        setAgendamentosDoDia(horasOcupadas);
      }
    }
    carregarDados();
  }, [dataSelecionada]); // O useEffect "vigia" a data selecionada

  // if (!config) return <div className="p-10">Carregando configurações...</div>

  if (!montado || !config) return <div className="p-10">Carregando...</div>

  const horariosDisponiveis = gerarSlotsDeHorario(
    config.horario_abertura,
    config.horario_fechamento,
    config.intervalo_minutos
  );

  const agora = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  )
  const dataHojeBrasilia = agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  const horariosFiltrados = horariosDisponiveis.filter((horario) => {
    // Se a data selecionada for um dia no futuro, todos os horários estão disponíveis
    if (dataSelecionada > dataHojeBrasilia) {
      return true;
    }

    // Se a data selecionada for hoje, precisamos comparar as horas
    if (dataSelecionada === dataHojeBrasilia) {
      const [hora, minuto] = horario.split(':').map(Number);

      // Criamos um objeto de data para o horário do slot HOJE
      const dataSlot = new Date();
      dataSlot.setHours(hora, minuto, 0, 0);

      // Só mostramos se o horário do slot for maior que o horário de agora
      return dataSlot > agora;
    }

    // Se for uma data passada, não mostra nada (segurança extra)
    return false;
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 w-full max-w-lg">

        {/* 2. Adicione a Logo aqui */}
        {config.logo_url && (
          <div className="flex justify-center mb-4">
            <img
              src={config.logo_url}
              alt="Logo"
              className="w-24 h-24 rounded-full object-cover shadow-sm"
            />
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          {config.nome_barbearia}
        </h1>
        <p className="text-center text-gray-500 mb-6">Selecione um horário para hoje</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-black mb-2">
            Escolha o dia:
          </label>
          <input
            type="date"
            value={dataSelecionada}
            min={new Date().toLocaleDateString('sv-SE', {
              timeZone: 'America/Sao_Paulo'
            })}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-black focus:ring-2 focus:ring-black outline-none"
          />
        </div>

        {/* Aqui é onde a mágica acontece: o Grid de horários */}

        <div className="grid grid-cols-3 gap-3">
          {horariosFiltrados.map((horario) => {
            const estaOcupado = agendamentosDoDia.includes(horario);

            return (
              <button
                key={horario}
                disabled={estaOcupado}
                className={`py-2 rounded-md font-medium transition-all border text-black ${estaOcupado
                  ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                  : horarioSelecionado === horario
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-black shadow-sm'
                  }`}
                onClick={() => setHorarioSelecionado(horario)}
              >
                {estaOcupado ? 'Ocupado' : horario}
              </button>
            );
          })}
        </div>

        {horarioSelecionado && (
          <div className="mt-8 p-4 border-2 border-black rounded-lg bg-gray-100">
            <h3 className="font-bold mb-4 text-center text-black">Finalizar para às {horarioSelecionado}</h3>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Seu nome"
                // Adicionamos 'text-black' para o texto aparecer e 'placeholder:text-gray-400' para a dica
                className="w-full p-2 border border-gray-300 rounded text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <input
                type="text"
                placeholder="Seu WhatsApp (apenas números)"
                className="w-full p-2 border border-gray-300 rounded text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                value={telefone}
                onChange={(e) => {
                  // Importe a função 'aplicarMascaraWhatsapp' de '@/lib/utils' se necessário
                  const valorFormatado = aplicarMascaraWhatsapp(e.target.value);
                  setTelefone(valorFormatado);
                }}
              />
              <button
                onClick={confirmarAgendamento}
                disabled={enviando}
                className="w-full bg-black text-white py-3 rounded-lg font-bold hover:opacity-90 disabled:bg-gray-400"
              >
                {enviando ? 'Processando...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-center text-gray-400">
            Atendimento das {config.horario_abertura.slice(0, 5)} às {config.horario_fechamento.slice(0, 5)}
          </p>
        </div>
      </div>
    </main>
  )
}