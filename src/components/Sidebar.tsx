'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Calendar, LogOut, Menu, X, LayoutDashboard } from 'lucide-react' 
import { supabase } from '@/lib/supabase'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Adicionamos o Dashboard aqui
  const menuItems = [
    { name: 'Agenda', href: '/admin', icon: Calendar },
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Configuração', href: '/admin/configuracoes', icon: Settings },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Botão Hambúrguer para Celular */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para fechar ao clicar fora (Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Barra Lateral - Agora usando bg-card para destacar do fundo da página */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen transition-transform bg-card border-r border-border
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 w-64
      `}>
        <div className="flex flex-col h-full px-3 py-4">
          <div className="mb-10 px-4 mt-12 lg:mt-4">
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase italic">
              BarberSoft
            </h2>
            <p className="text-[10px] text-gray-400 font-bold -mt-1">POWERED BY CODERX</p>
          </div>

          <nav className="flex-1 space-y-2 font-medium">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center p-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-foreground hover:bg-hover/20 hover:text-primary'
                  }`}
                >
                  <Icon size={22} />
                  <span className="ml-3">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center p-3 mt-auto text-red-500 rounded-xl hover:bg-red-50/10 font-bold transition-colors"
          >
            <LogOut size={22} />
            <span className="ml-3">Sair da Conta</span>
          </button>
        </div>
      </aside>
    </>
  )
}