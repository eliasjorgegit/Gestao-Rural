import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { PropertySection } from './components/PropertySection.tsx';
import { ActivitiesSection } from './components/ActivitiesSection.tsx';
import { PlotsSection } from './components/PlotsSection.tsx';
import { CyclesSection } from './components/CyclesSection.tsx';
import { CostsSection } from './components/CostsSection.tsx';
import { HarvestsSection } from './components/HarvestsSection.tsx';
import { ReportsSection } from './components/ReportsSection.tsx';
import { InventorySection } from './components/InventorySection.tsx';
import { 
  Sprout, 
  Landmark, 
  LayoutGrid, 
  CalendarDays, 
  DollarSign, 
  ShoppingBag, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  Sparkles,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'basics' | 'cycles' | 'costs' | 'harvests' | 'reports' | 'inventory'>('basics');
  
  // State to trigger reactive updates in dependent components
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const navItems = [
    { id: 'basics', name: 'Cadastros Básicos', desc: 'Fazenda, Culturas e Áreas', icon: Landmark },
    { id: 'cycles', name: 'Ciclos Produtivos', desc: 'Planejar Safras e Lotes', icon: CalendarDays },
    { id: 'inventory', name: 'Estoque de Insumos', desc: 'Sementes, Adubos e Ferramentas', icon: Package },
    { id: 'costs', name: 'Lançamento de Custos', desc: 'Despesas e Insumos', icon: DollarSign },
    { id: 'harvests', name: 'Produção / Colheita', desc: 'Coletas e Vendas', icon: ShoppingBag },
    { id: 'reports', name: 'Relatórios & Análise', desc: 'Análise de Resultados', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col font-sans text-stone-800">
      
      {/* HEADER / TOP BAR - Ocultado na Impressão */}
      <header className="bg-white border-b border-stone-200 text-stone-800 py-4 px-6 flex justify-between items-center print:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-[#3a4d39] p-2 rounded-xl text-stone-100 shadow-xs">
            <Sprout className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <h1 className="font-serif italic font-bold text-lg tracking-tight leading-tight text-stone-900">Gestão Rural</h1>
            <p className="text-xxs text-stone-500 font-semibold tracking-wider uppercase">Painel do Produtor Rural</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <div className="w-6 h-6 rounded-full bg-[#3a4d39] flex items-center justify-center text-xs font-bold text-amber-100">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-semibold text-stone-600 hidden sm:inline">{user?.email}</span>
          </div>

          <button
            id="logout-button"
            onClick={logout}
            className="flex items-center gap-1.5 text-xs bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR / NAVIGATION - Ocultado na Impressão */}
        <aside className="w-full md:w-80 bg-[#3a4d39] border-r border-[#4f6b4e]/30 p-6 flex flex-col justify-between print:hidden">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xxs font-bold text-amber-200 uppercase tracking-widest block">Navegação Principal</span>
              <p className="text-xs text-stone-300 opacity-80">Selecione o módulo para gerenciamento integrado</p>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer group ${
                      isActive 
                        ? 'bg-[#4f6b4e] border-[#4f6b4e] border-r-4 border-r-amber-200 text-white font-bold shadow-xs' 
                        : 'bg-transparent border-transparent text-stone-300 hover:bg-[#4f6b4e]/55 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${
                        isActive ? 'bg-[#739072] text-white' : 'bg-[#3a4d39]/40 text-stone-300 group-hover:bg-[#4f6b4e]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className={`text-xxs ${isActive ? 'text-stone-300' : 'text-stone-400 group-hover:text-stone-300'}`}>{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      isActive ? 'text-amber-200 translate-x-0.5' : 'text-stone-400 group-hover:text-stone-300'
                    }`} />
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 pt-4 border-t border-[#4f6b4e]/40 text-center">
            <p className="text-xxs font-mono text-stone-400">Versão 1.0.0 • Gestão Privada</p>
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto bg-[#fdfbf7]">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              
              {/* RENDERING THE SECTIONS */}

              {/* 1. CADASTROS BÁSICOS */}
              {activeTab === 'basics' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 print:hidden">
                    <Landmark className="w-5 h-5 text-[#3a4d39]" />
                    <h2 className="font-serif italic font-semibold text-xl text-stone-850">Módulo de Cadastros Principais</h2>
                  </div>
                  
                  <PropertySection onPropertyChange={triggerRefresh} />
                  <PlotsSection key={`plots-${refreshTrigger}`} onRefresh={triggerRefresh} />
                  <ActivitiesSection key={`acts-${refreshTrigger}`} onRefresh={triggerRefresh} />
                </div>
              )}

              {/* 2. CICLOS PRODUTIVOS */}
              {activeTab === 'cycles' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 print:hidden">
                    <CalendarDays className="w-5 h-5 text-[#3a4d39]" />
                    <h2 className="font-serif italic font-semibold text-xl text-stone-850">Módulo de Ciclos Produtivos</h2>
                  </div>

                  <CyclesSection onRefresh={triggerRefresh} />
                </div>
              )}

              {/* 3. CONTROLE DE ESTOQUE */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 print:hidden">
                    <Package className="w-5 h-5 text-[#3a4d39]" />
                    <h2 className="font-serif italic font-semibold text-xl text-stone-850">Módulo de Controle de Estoque</h2>
                  </div>

                  <InventorySection onRefresh={triggerRefresh} />
                </div>
              )}

              {/* 3. LANÇAMENTO DE CUSTOS */}
              {activeTab === 'costs' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 print:hidden">
                    <DollarSign className="w-5 h-5 text-[#3a4d39]" />
                    <h2 className="font-serif italic font-semibold text-xl text-stone-850">Módulo de Custos Agrícolas</h2>
                  </div>

                  <CostsSection onRefresh={triggerRefresh} />
                </div>
              )}

              {/* 4. PRODUÇÃO / COLHEITA */}
              {activeTab === 'harvests' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 print:hidden">
                    <ShoppingBag className="w-5 h-5 text-[#3a4d39]" />
                    <h2 className="font-serif italic font-semibold text-xl text-stone-850">Módulo de Colheitas & Produção</h2>
                  </div>

                  <HarvestsSection onRefresh={triggerRefresh} />
                </div>
              )}

              {/* 5. ANÁLISE & RELATÓRIOS (DASHBOARD COMPLETO) */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 print:hidden">
                    <BarChart3 className="w-5 h-5 text-[#3a4d39]" />
                    <h2 className="font-serif italic font-semibold text-xl text-stone-850">Consolidação e Fechamentos</h2>
                  </div>

                  <ReportsSection key={`reports-${refreshTrigger}`} />
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </main>
      </div>

    </div>
  );
}

function LoginScreen() {
  const { login, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#3a4d39] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative ambient blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-200/10 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#739072]/15 blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#fdfbf7] border border-[#d2c49a] p-8 rounded-3xl shadow-xl relative z-10 space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex bg-[#ece3ce] text-[#3a4d39] p-4 rounded-2xl border border-[#d2c49a] shadow-inner">
            <Sprout className="w-8 h-8 text-[#3a4d39]" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif italic font-bold text-3xl text-stone-900 tracking-tight leading-none">Gestão Rural</h1>
            <p className="text-sm text-stone-600 font-medium">Controle de Propriedades, Ciclos, Custos e Receitas</p>
          </div>
        </div>

        <div className="bg-[#ece3ce]/50 p-4 rounded-2xl border border-[#d2c49a]/70 text-center space-y-1">
          <span className="text-xxs font-bold text-[#3a4d39] tracking-wider uppercase flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Uso Pessoal Privado
          </span>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">
            Painel simplificado com banco de dados relacional e relatórios integrados.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3a4d39]"></div>
              <p className="text-xs text-stone-600 font-medium">Autenticando sessão...</p>
            </div>
          ) : (
            <button
              id="google-signin-btn"
              onClick={login}
              className="w-full py-3.5 px-5 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 border border-stone-200"
            >
              {/* Google SVG G logo */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.68 14.93 1 12 1 7.37 1 3.4 3.66 1.48 7.56l3.75 2.91C6.11 7.07 8.84 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.71 2.88c2.17-2 3.7-4.96 3.7-8.61z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.23 14.75a7.16 7.16 0 010-4.51L1.48 7.33a11.96 11.96 0 000 9.33l3.75-2.91z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.71-2.88c-1.03.69-2.35 1.1-4.25 1.1-3.16 0-5.89-2.03-6.77-5.43L1.48 15.8c1.92 3.9 5.89 6.56 10.52 6.56z"
                />
              </svg>
              Entrar com o Google
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-xxs text-stone-500 font-semibold uppercase tracking-wider">
            Segurança autenticada por Firebase Auth
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3a4d39] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-200"></div>
        <p className="text-sm font-sans text-stone-300 font-medium">Carregando painel de controle...</p>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
