'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Admin() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])

  useEffect(() => {
    carregarAgendamentos()
  }, [])

  async function carregarAgendamentos() {
    const { data } = await supabase
      .from('agendamentos')
      .select('*')
      .order('data_hora', { ascending: true })
    if (data) setAgendamentos(data)
  }

  async function finalizar(id: string) {
    if (!confirm("Marcar como concluído?")) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-black">Agenda do Dia</h1>
        <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:underline">Sair</button>
      </div>

      <div className="space-y-4">
        {agendamentos.map((ag) => (
          <div key={ag.id} className="p-4 bg-white border rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <p className="font-bold text-lg text-black">{ag.nome_cliente}</p>
              <a
                href={`https://wa.me/55${ag.telefone_cliente.replace(/\D/g, '')}?text=Olá ${ag.nome_cliente}, confirmamos seu horário hoje às ${new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}
                target="_blank"
                className="text-green-600 text-sm font-medium hover:underline"
              >
                📱 {ag.telefone_cliente}
              </a>
            </div>

            <div className="flex items-center gap-4">
              <span className="bg-black text-white px-3 py-1 rounded-md text-sm font-bold">
                {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
              </span>
              <button onClick={() => finalizar(ag.id)} className="bg-green-100 text-green-700 p-2 rounded-full hover:bg-green-200">✅</button>
            </div>
          </div>
        ))}
        {agendamentos.length === 0 && <p className="text-center text-gray-500">Nenhum agendamento para hoje.</p>}
      </div>
    </main>
  )
}