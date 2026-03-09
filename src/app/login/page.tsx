'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [carregando, setCarregando] = useState(false)


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
        // Força o navegador a recarregar totalmente no painel admin
        // Isso garante que o middleware perceba o novo cookie de sessão
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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-black">Braw Barbearia</h2>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full p-3 border border-gray-300 rounded text-black outline-none focus:ring-2 focus:ring-black"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-3 border border-gray-300 rounded text-black outline-none focus:ring-2 focus:ring-black"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={carregando}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:opacity-90 disabled:bg-gray-400 transition-all"
          >
            {carregando ? 'Acessando...' : 'Entrar na Agenda'}
          </button>
        </div>
      </form>
    </main>
  )
}