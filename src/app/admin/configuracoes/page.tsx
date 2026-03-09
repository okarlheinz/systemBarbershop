'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'

export default function Configuracoes() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome_barbearia: '',
    horario_abertura: '',
    horario_fechamento: '',
    intervalo_minutos: 30
  })

  useEffect(() => {
    async function carregarConfig() {
      const { data } = await supabase.from('configuracoes').select('*').single()
      if (data) {
        setForm({
          nome_barbearia: data.nome_barbearia,
          horario_abertura: data.horario_abertura,
          horario_fechamento: data.horario_fechamento,
          intervalo_minutos: data.intervalo_minutos
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
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black mb-8 text-black">Configuração do Sistema</h1>
          
          <form onSubmit={salvar} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Barbearia</label>
              <input 
                type="text" 
                value={form.nome_barbearia}
                onChange={e => setForm({...form, nome_barbearia: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Abertura</label>
                <input 
                  type="time" 
                  value={form.horario_abertura}
                  onChange={e => setForm({...form, horario_abertura: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Fechamento</label>
                <input 
                  type="time" 
                  value={form.horario_fechamento}
                  onChange={e => setForm({...form, horario_fechamento: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Intervalo entre Atendimentos (minutos)</label>
              <select 
                value={form.intervalo_minutos}
                onChange={e => setForm({...form, intervalo_minutos: Number(e.target.value)})}
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