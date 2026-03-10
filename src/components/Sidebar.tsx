'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Calendar, LogOut, Menu, X, LayoutDashboard } from 'lucide-react'
import { supabase } from '@/lib/supabase'


export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function buscarLogo() {
      const { data } = await supabase
        .from('configuracoes')
        .select('logo_url')
        .single();

      if (data?.logo_url) {
        setLogoUrl(data.logo_url);
      }
    }
    buscarLogo();
  }, []);

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
        fixed top-0 left-0 z-40 h-screen transition-transform bg-background border-r border-border
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 w-64
      `}>
        <div className="flex flex-col h-full px-3 py-4">
          <div className="mb-10 px-4 mt-12 lg:mt-4">
            <div className="flex flex-col items-center mb-4 pt-6"> {/* Diminuímos mb-8 para mb-4 */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo Barbearia"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
                /* Aumentamos de w-20 para w-28 e a borda para 4 para dar mais peso */
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xs text-center px-2">Sem Logo</span>
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase italic">
              Agendei.vc
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
                  className={`flex items-center p-3 rounded-xl transition-all ${isActive
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