import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Cost, Harvest, Cycle, Plot } from '../types.ts';
import { 
  FileSpreadsheet, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  BarChart3, 
  TableProperties, 
  CalendarDays,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const ReportsSection: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  
  // Tab inside Reports
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'costs'>('dashboard');
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCosts, resHarvests, resCycles, resPlots] = await Promise.all([
        fetchWithAuth('/api/costs'),
        fetchWithAuth('/api/harvests'),
        fetchWithAuth('/api/cycles'),
        fetchWithAuth('/api/plots')
      ]);

      if (resCosts.ok && resHarvests.ok && resCycles.ok && resPlots.ok) {
        setCosts(await resCosts.json());
        setHarvests(await resHarvests.json());
        setCycles(await resCycles.json());
        setPlots(await resPlots.json());
      } else {
        setError('Erro ao carregar dados dos relatórios.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists based on selection
  const filteredCycles = cycles.filter(c => {
    if (selectedPlotId && c.plotId !== parseInt(selectedPlotId)) return false;
    return true;
  });

  const filteredCosts = costs.filter(cost => {
    // Find the cycle of this cost
    const cycle = cycles.find(c => c.id === cost.cycleId);
    if (!cycle) return false;
    
    if (selectedPlotId && cycle.plotId !== parseInt(selectedPlotId)) return false;
    if (selectedCycleId && cost.cycleId !== parseInt(selectedCycleId)) return false;
    
    return true;
  });

  const filteredHarvests = harvests.filter(harvest => {
    const cycle = cycles.find(c => c.id === harvest.cycleId);
    if (!cycle) return false;

    if (selectedPlotId && cycle.plotId !== parseInt(selectedPlotId)) return false;
    if (selectedCycleId && harvest.cycleId !== parseInt(selectedCycleId)) return false;

    return true;
  });

  // Calculations
  const totalCusto = filteredCosts.reduce((acc, curr) => acc + curr.value, 0);
  const totalReceita = filteredHarvests.reduce((acc, curr) => acc + (curr.quantity * curr.pricePerUnit), 0);
  const lucroLiquido = totalReceita - totalCusto;

  // Grouped costs by category for mini visual charts
  const costsByCategory: Record<string, number> = {};
  filteredCosts.forEach(curr => {
    costsByCategory[curr.category] = (costsByCategory[curr.category] || 0) + curr.value;
  });

  // Grouped harvests by product/activity
  const productionByActivity: Record<string, { quantity: number, unit: string, revenue: number }> = {};
  filteredHarvests.forEach(curr => {
    const cycle = cycles.find(c => c.id === curr.cycleId);
    const actName = cycle?.activityName || "Outros";
    if (!productionByActivity[actName]) {
      productionByActivity[actName] = { quantity: 0, unit: curr.unit, revenue: 0 };
    }
    productionByActivity[actName].quantity += curr.quantity;
    productionByActivity[actName].revenue += curr.quantity * curr.pricePerUnit;
  });

  // CSV Export functions
  const exportCostsToCSV = () => {
    const headers = ['Data', 'Ciclo Produtivo', 'Talhão', 'Categoria', 'Descrição', 'Valor (R$)'];
    const rows = filteredCosts.map(c => [
      new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      c.cycleName || '',
      c.plotName || '',
      c.category,
      c.description.replace(/,/g, ';'),
      c.value.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_custos_${selectedPlotId || 'geral'}_${selectedCycleId || 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFinancialToCSV = () => {
    const headers = ['Métrica', 'Valor (R$)'];
    const rows = [
      ['Custo Total', totalCusto.toFixed(2)],
      ['Receita Bruta', totalReceita.toFixed(2)],
      ['Lucro / Prejuízo Líquido', lucroLiquido.toFixed(2)]
    ];

    // Add category breakdown to report
    rows.push(['', '']);
    rows.push(['Custos por Categoria', '']);
    Object.entries(costsByCategory).forEach(([cat, val]) => {
      rows.push([cat, val.toFixed(2)]);
    });

    // Add production breakdown to report
    rows.push(['', '']);
    rows.push(['Produção / Colheita por Atividade', '']);
    Object.entries(productionByActivity).forEach(([act, data]) => {
      rows.push([`${act} (${data.quantity} ${data.unit})`, data.revenue.toFixed(2)]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analise_financeira_${selectedPlotId || 'geral'}_${selectedCycleId || 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printing function
  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.error('Falha ao acionar window.print():', e);
    }
    
    // Se o aplicativo estiver rodando dentro de um iframe (como o painel do AI Studio),
    // mostramos um aviso amigável explicando como o usuário pode imprimir com sucesso.
    if (typeof window !== 'undefined' && window.self !== window.top) {
      setShowPrintWarning(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3a4d39]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Seleções - Ocultados na impressão */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Filter className="w-5 h-5 text-[#3a4d39]" />
            <h3 className="font-serif italic font-bold text-stone-850 text-base">Filtros de Consolidação</h3>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filtro de Talhão */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Talhão:</span>
              <select
                id="filter-plot-select"
                value={selectedPlotId}
                onChange={(e) => {
                  setSelectedPlotId(e.target.value);
                  setSelectedCycleId(''); // Reset cycle when changing plot
                }}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-sans focus:outline-hidden focus:border-[#3a4d39] bg-stone-50"
              >
                <option value="">-- Todos os Talhões --</option>
                {plots.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.size} ha)</option>
                ))}
              </select>
            </div>

            {/* Filtro de Safra / Ciclo */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Ciclo/Safra:</span>
              <select
                id="filter-cycle-select"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-sans focus:outline-hidden focus:border-[#3a4d39] bg-stone-50"
              >
                <option value="">-- Todos os Ciclos --</option>
                {filteredCycles.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.activityName})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Título de Impressão (Aparece somente impresso) */}
      <div className="hidden print:block border-b-2 border-stone-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-stone-900 font-serif italic">SISTEMA DE GESTÃO RURAL</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">Relatório Consolidado de Resultados Financeiros</p>
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-mono text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
          <div>
            <p><strong>Filtro de Talhão:</strong> {selectedPlotId ? plots.find(p => p.id === parseInt(selectedPlotId))?.name : "Todos"}</p>
            <p><strong>Filtro de Ciclo/Safra:</strong> {selectedCycleId ? cycles.find(c => c.id === parseInt(selectedCycleId))?.name : "Todos"}</p>
          </div>
          <div className="text-right">
            <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Status do Sistema:</strong> Fechamento Gerado por IA</p>
          </div>
        </div>
      </div>

      {/* Cards Financeiros (Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Receita Bruta */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Receita Bruta</p>
            <p className="text-2xl font-bold font-mono text-stone-800">
              {totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xxs text-stone-400">Resultados da comercialização colhida</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#ece3ce]/60 text-[#3a4d39] print:hidden">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Custo Total */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Custo Total</p>
            <p className="text-2xl font-bold font-mono text-stone-800">
              {totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xxs text-stone-400 font-sans">Soma de todos os custos diretos</p>
          </div>
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600 print:hidden">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Lucro / Prejuízo Líquido */}
        <div className={`bg-white rounded-2xl border p-6 shadow-xs flex items-center justify-between ${
          lucroLiquido >= 0 ? 'border-[#d2c49a] bg-[#ece3ce]/10' : 'border-red-100 bg-red-50/5'
        }`}>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Lucro / Prejuízo Líquido</p>
            <p className={`text-2xl font-bold font-mono ${lucroLiquido >= 0 ? 'text-[#3a4d39]' : 'text-red-700'}`}>
              {lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xxs text-stone-400 font-sans">Margem líquida de rentabilidade</p>
          </div>
          <div className={`p-3.5 rounded-xl print:hidden ${lucroLiquido >= 0 ? 'bg-[#ece3ce] text-[#3a4d39]' : 'bg-red-100 text-red-800'}`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navegação entre Visualização Dashboard vs Relatório de Custos (Ocultado na impressão) */}
      <div className="flex border-b border-stone-200 print:hidden">
        <button
          id="tab-sub-dashboard"
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer font-serif italic ${
            activeSubTab === 'dashboard' 
              ? 'border-[#3a4d39] text-[#3a4d39] font-bold' 
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Análise de Resultados (Dashboard)
        </button>
        <button
          id="tab-sub-costs"
          onClick={() => setActiveSubTab('costs')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer font-serif italic ${
            activeSubTab === 'costs' 
              ? 'border-[#3a4d39] text-[#3a4d39] font-bold' 
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <TableProperties className="w-4 h-4" />
          Relatório Detalhado de Custos
        </button>
      </div>

      {/* SUB-TABS BODY */}

      {/* 1. ANÁLISE DE RESULTADOS */}
      {(activeSubTab === 'dashboard' || window.matchMedia('print').matches) && (
        <div className={`space-y-6 ${activeSubTab !== 'dashboard' ? 'hidden print:block' : ''}`}>
          
          {/* Ações superiores para Análise de Resultados */}
          <div className="flex justify-between items-center bg-stone-50 px-6 py-3.5 rounded-xl border border-stone-200 print:hidden">
            <span className="text-xs font-semibold text-stone-500">Planilha de Análise de Resultados</span>
            <div className="flex gap-2">
              <button
                id="export-financial-csv-btn"
                onClick={exportFinancialToCSV}
                className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 px-3.5 py-2 rounded-xl transition-all shadow-xxs cursor-pointer font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#3a4d39]" />
                Exportar CSV
              </button>
              <button
                id="print-financial-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-3.5 py-2 rounded-xl transition-all shadow-xxs cursor-pointer font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Relatório
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Custos por Categoria (Mini Visualizer) */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <h4 className="font-serif italic font-bold text-stone-850 text-base mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#3a4d39]" />
                Distribuição de Custos por Categoria
              </h4>
              
              {Object.keys(costsByCategory).length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  Nenhum custo lançado no período selecionado.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(costsByCategory).map(([cat, val]) => {
                    const percentage = (val / totalCusto) * 100;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-stone-600">
                          <span>{cat}</span>
                          <span className="font-mono font-bold text-stone-800">
                            {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2">
                          <div 
                            className="bg-[#3a4d39] h-2 rounded-full animate-all" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Produção por Cultura / Atividade */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <h4 className="font-serif italic font-bold text-stone-850 text-base mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#3a4d39]" />
                Desempenho Comercial por Cultura
              </h4>

              {Object.keys(productionByActivity).length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  Nenhuma colheita registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(productionByActivity).map(([act, data]) => {
                    const percentage = (data.revenue / (totalReceita || 1)) * 100;
                    return (
                      <div key={act} className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-200/60">
                        <div>
                          <p className="font-serif italic font-bold text-stone-850 text-sm">{act}</p>
                          <p className="text-xs text-stone-400 font-medium">Vol. Colhido: {data.quantity} {data.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#3a4d39] text-sm font-mono">
                            {data.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-xxs text-stone-400">Participação: {percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. RELATÓRIO DE CUSTOS DETALHADOS */}
      {(activeSubTab === 'costs' || window.matchMedia('print').matches) && (
        <div className={`space-y-6 ${activeSubTab !== 'costs' ? 'hidden print:block' : ''}`}>
          
          {/* Ações superiores para Relatório de Custos */}
          <div className="flex justify-between items-center bg-stone-50 px-6 py-3.5 rounded-xl border border-stone-200 print:hidden">
            <span className="text-xs font-semibold text-stone-500">Planilha de Custos Filtrados</span>
            <div className="flex gap-2">
              <button
                id="export-costs-csv-btn"
                onClick={exportCostsToCSV}
                className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 px-3.5 py-2 rounded-xl transition-all shadow-xxs cursor-pointer font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#3a4d39]" />
                Exportar CSV
              </button>
              <button
                id="print-costs-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-3.5 py-2 rounded-xl transition-all shadow-xxs cursor-pointer font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Tabela
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {filteredCosts.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                Nenhum custo lançado atende aos filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Talhão / Área</th>
                    <th className="py-3.5 px-4">Safra / Ciclo</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Descrição do Insumo/Serviço</th>
                    <th className="py-3.5 px-4 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                  {filteredCosts.map((cost) => (
                    <tr key={cost.id} className="hover:bg-[#ece3ce]/10 transition-all">
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {new Date(cost.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-serif italic font-bold text-stone-850 text-sm">{cost.plotName}</td>
                      <td className="py-3 px-4 text-stone-500 font-medium">{cost.cycleName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-[#ece3ce]/70 text-[#3a4d39] border border-[#d2c49a]/35 text-xxs font-semibold px-2.5 py-0.5 rounded-full">
                          {cost.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 max-w-xs truncate">{cost.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {cost.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                  {/* Totalizador */}
                  <tr className="bg-stone-50 font-bold text-stone-850 border-t border-stone-200">
                    <td colSpan={5} className="py-4 px-4 text-right uppercase tracking-wider text-xxs font-semibold text-stone-500">Custo Consolidado Total:</td>
                    <td className="py-4 px-4 text-right font-mono text-base text-red-650">
                      {totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Rodapé impresso */}
      <div className="hidden print:block text-center text-xxs font-mono text-stone-400 mt-12 border-t pt-4">
        Sistemas de Gestão Agrícola - Propriedade Compartilhada. Todos os direitos reservados.
      </div>

      {/* Modal de Ajuda de Impressão (Aparece se for detectado iframe) */}
      {showPrintWarning && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-stone-850">
              <Printer className="w-6 h-6 text-[#3a4d39]" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Configuração de Impressão</h3>
            </div>
            
            <p className="text-sm text-stone-600 leading-relaxed">
              Como o sistema está sendo executado em modo de visualização (dentro de um painel/iframe de desenvolvimento), navegadores modernos bloqueiam o comando de impressão direta por segurança.
            </p>

            <p className="text-sm text-stone-600 leading-relaxed font-medium">
              Para resolver isso, clique no botão verde abaixo para abrir o aplicativo diretamente em tela cheia numa nova aba, onde o botão de imprimir funcionará perfeitamente!
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPrintWarning(false)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                Voltar
              </button>
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Aplicativo em Nova Guia
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
