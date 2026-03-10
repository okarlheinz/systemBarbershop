'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Calendar, LogOut, Menu, X } from 'lucide-react' // Instale: npm install lucide-react
import { supabase } from '@/lib/supabase'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = [
    { name: 'Agenda', href: '/admin', icon: Calendar },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg"
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

      {/* Barra Lateral */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen transition-transform bg-background border-r border-border
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 w-64
      `}>
        <div className="flex flex-col h-full px-3 py-4">
          <div className="mb-10 px-4">
            <h2 className="text-xl font-black text-foreground tracking-tighter">CODERX ADMIN</h2>
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
                  className={`flex items-center p-3 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-foreground hover:bg-hover hover:text-gray-900'
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
            className="flex items-center p-3 mt-auto text-red-600 rounded-xl hover:bg-red-50 font-bold"
          >
            <LogOut size={22} />
            <span className="ml-3">Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}