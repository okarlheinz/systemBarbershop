'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    })

    if (error) {
      alert("Credenciais inválidas: " + error.message)
      setCarregando(false)
    } else {
      // O Middleware detectará a nova sessão e redirecionará automaticamente 
      // ao tentarmos acessar o /admin ou recarregar
      window.location.assign('/admin')
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