'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [config, setConfig] = useState<{ nome_barbearia: string; logo_url: string; tema: string } | null>(null)

  useEffect(() => {
    async function carregarConfig() {
      const { data } = await supabase
        .from('configuracoes')
        .select('nome_barbearia, logo_url, tema')
        .single()
      
      if (data) {
        setConfig(data)
        const temaDefinido = data.tema || 'light'
        document.documentElement.setAttribute('data-theme', temaDefinido)
      }
    }
    carregarConfig()
  }, [])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        alert("Erro ao entrar: " + error.message);
        setCarregando(false);
        return;
      }

      if (data?.session) {
        window.location.replace('/admin');
      } else {
        setCarregando(false);
        alert("Não foi possível estabelecer uma sessão.");
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      setCarregando(false);
      alert("Ocorreu um erro inesperado no login.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-card p-6 transition-colors duration-300 relative">
      <form onSubmit={handleLogin} className="bg-background p-8 rounded-xl shadow-lg w-full max-w-sm border border-border">
        
        {/* Logo e Nome Dinâmicos */}
        <div className="flex flex-col items-center mb-6">
          {config?.logo_url ? (
            <img 
              src={config.logo_url} 
              alt="Logo" 
              className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 animate-pulse" />
          )}
          
          <h2 className="text-2xl font-bold text-center text-foreground">
            {config?.nome_barbearia || 'Carregando...'}
          </h2>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full p-3 border border-border rounded bg-white text-black outline-none focus:ring-2 focus:ring-primary"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-3 border border-border rounded bg-white text-black outline-none focus:ring-2 focus:ring-primary"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={carregando}
            className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:opacity-90 disabled:bg-gray-400 transition-all"
          >
            {carregando ? 'Acessando...' : 'Entrar na Agenda'}
          </button>
        </div>
      </form>

      {/* Rodapé Discreto no Canto Esquerdo */}
      <div className="fixed bottom-6 left-6 opacity-60 hover:opacity-100 transition-opacity hidden md:block">
        <h2 className="text-xl font-black text-foreground tracking-tighter uppercase italic">
          Agendei.vc
        </h2>
        <p className="text-[10px] text-gray-400 font-bold -mt-1">POWERED BY CODERX</p>
      </div>
    </main>
  )
}