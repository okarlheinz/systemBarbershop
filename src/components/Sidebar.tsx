'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Calendar, LogOut, Menu, X, LayoutDashboard, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [permissao, setPermissao] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_permissao')
    }
    return null
  });

  useEffect(() => {
    async function inicializar() {
      // Busca Logo
      const { data: config } = await supabase.from('configuracoes').select('logo_url').single();
      if (config?.logo_url) setLogoUrl(config.logo_url);

      // Busca Permissão
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: atendente } = await supabase
          .from('atendentes')
          .select('permissao')
          .eq('auth_user_id', user.id)
          .single();
        
        const nivel = atendente?.permissao || 'completo';
        setPermissao(nivel);
        localStorage.setItem('user_permissao', nivel);
      }
    }
    inicializar();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('user_permissao');
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // --- MODO HEADER PARA ATENDENTE (Apenas Agenda) ---
  if (permissao === 'apenas_agenda') {
    return (
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">A</div>
          )}
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-foreground tracking-tighter uppercase italic leading-none">Agendei.vc</h2>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Minha Agenda</span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-red-500 font-bold text-xs hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
        >
          <LogOut size={18} /> Sair
        </button>
      </header>
    )
  }

  // --- MODO SIDEBAR PARA ADMIN (Acesso Completo) ---
  const menuItems = [
    { name: 'Agenda', href: '/admin', icon: Calendar, visible: true },
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, visible: true },
    { name: 'Atendentes', href: '/admin/equipe', icon: Users, visible: true },
    { name: 'Configuração', href: '/admin/configuracoes', icon: Settings, visible: true },
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 z-40 h-screen transition-transform bg-background border-r border-border
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 w-64
      `}>
        <div className="flex flex-col h-full px-3 py-4">
          <div className="mb-10 px-4 mt-12 lg:mt-4">
            <div className="flex flex-col items-center mb-4 pt-6">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xs text-center px-2">Sem Logo</span>
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase italic">Agendei.vc</h2>
            <p className="text-[10px] text-gray-400 font-bold -mt-1 uppercase">Powered by CoderX</p>
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