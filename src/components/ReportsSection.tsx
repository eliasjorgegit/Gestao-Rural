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
  ExternalLink,
  Layers,
  PieChart,
  Scale,
  Sprout
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
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'per_hectare' | 'costs'>('dashboard');
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

  // --- CÁLCULOS DETALHADOS POR HECTARE ---
  const selectedPlotObj = selectedPlotId ? plots.find(p => p.id === parseInt(selectedPlotId)) : null;
  const selectedCycleObj = selectedCycleId ? cycles.find(c => c.id === parseInt(selectedCycleId)) : null;

  let totalAreaHectares = 0;
  if (selectedCycleObj) {
    const cyclePlot = plots.find(p => p.id === selectedCycleObj.plotId);
    totalAreaHectares = cyclePlot?.size || selectedCycleObj.plotSize || 0;
  } else if (selectedPlotObj) {
    totalAreaHectares = selectedPlotObj.size || 0;
  } else {
    const activePlotIds = new Set(filteredCycles.map(c => c.plotId));
    if (activePlotIds.size > 0) {
      totalAreaHectares = plots
        .filter(p => activePlotIds.has(p.id))
        .reduce((acc, p) => acc + (p.size || 0), 0);
    } else {
      totalAreaHectares = plots.reduce((acc, p) => acc + (p.size || 0), 0);
    }
  }

  const custoMedioPorHectare = totalAreaHectares > 0 ? totalCusto / totalAreaHectares : 0;
  const receitaMediaPorHectare = totalAreaHectares > 0 ? totalReceita / totalAreaHectares : 0;
  const lucroMedioPorHectare = receitaMediaPorHectare - custoMedioPorHectare;

  // Detalhamento de custo por hectare por categoria
  const categoryHectareData = Object.entries(costsByCategory).map(([cat, val]) => {
    const perHa = totalAreaHectares > 0 ? val / totalAreaHectares : 0;
    const percentage = totalCusto > 0 ? (val / totalCusto) * 100 : 0;
    return {
      category: cat,
      totalVal: val,
      perHa,
      percentage
    };
  }).sort((a, b) => b.totalVal - a.totalVal);

  // Detalhamento por Ciclo / Talhão (Custo por hectare em cada talhão)
  const cycleHectareBreakdown = filteredCycles.map(cycle => {
    const plot = plots.find(p => p.id === cycle.plotId);
    const plotSize = plot?.size || cycle.plotSize || 1;
    const cycleCostsList = filteredCosts.filter(c => c.cycleId === cycle.id);
    const totalCycleCost = cycleCostsList.reduce((acc, c) => acc + c.value, 0);
    const cycleCostPerHa = totalCycleCost / (plotSize > 0 ? plotSize : 1);

    const cycleCategoryCosts: Record<string, number> = {};
    cycleCostsList.forEach(c => {
      cycleCategoryCosts[c.category] = (cycleCategoryCosts[c.category] || 0) + c.value;
    });

    return {
      cycle,
      plot,
      plotSize,
      totalCycleCost,
      cycleCostPerHa,
      categoryBreakdown: cycleCategoryCosts
    };
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

  const exportHectareToCSV = () => {
    const headers = ['Categoria de Custo', 'Custo Total (R$)', 'Área Total (ha)', 'Custo por Hectare (R$/ha)', 'Participação (%)'];
    const rows = categoryHectareData.map(item => [
      item.category,
      item.totalVal.toFixed(2),
      totalAreaHectares.toFixed(2),
      item.perHa.toFixed(2),
      item.percentage.toFixed(1) + '%'
    ]);

    rows.push(['', '', '', '', '']);
    rows.push(['RESUMO GERAL POR HECTARE', '', '', '', '']);
    rows.push(['Área Total Analisada', totalAreaHectares.toFixed(2) + ' ha', '', '', '']);
    rows.push(['Custo Médio / ha', custoMedioPorHectare.toFixed(2) + ' R$/ha', '', '', '100%']);
    rows.push(['Receita Média / ha', receitaMediaPorHectare.toFixed(2) + ' R$/ha', '', '', '']);
    rows.push(['Lucro Médio / ha', lucroMedioPorHectare.toFixed(2) + ' R$/ha', '', '', '']);

    rows.push(['', '', '', '', '']);
    rows.push(['DETALHAMENTO POR CICLO E TALHÃO', 'Área (ha)', 'Custo Total (R$)', 'Custo por Hectare (R$/ha)', '']);
    cycleHectareBreakdown.forEach(item => {
      rows.push([
        `${item.cycle.name} (${item.plot?.name || item.cycle.plotName})`,
        item.plotSize.toFixed(2),
        item.totalCycleCost.toFixed(2),
        item.cycleCostPerHa.toFixed(2),
        ''
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `custos_por_hectare_${selectedPlotId || 'geral'}_${selectedCycleId || 'geral'}.csv`);
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

      {/* Navegação entre Visualização Dashboard, Custos por Hectare e Relatório de Custos (Ocultado na impressão) */}
      <div className="flex border-b border-stone-200 print:hidden overflow-x-auto">
        <button
          id="tab-sub-dashboard"
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer font-serif italic whitespace-nowrap ${
            activeSubTab === 'dashboard' 
              ? 'border-[#3a4d39] text-[#3a4d39] font-bold' 
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Análise de Resultados (Dashboard)
        </button>
        <button
          id="tab-sub-per-hectare"
          onClick={() => setActiveSubTab('per_hectare')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer font-serif italic whitespace-nowrap ${
            activeSubTab === 'per_hectare' 
              ? 'border-[#3a4d39] text-[#3a4d39] font-bold' 
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <Scale className="w-4 h-4" />
          Custos por Hectare (R$/ha)
        </button>
        <button
          id="tab-sub-costs"
          onClick={() => setActiveSubTab('costs')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer font-serif italic whitespace-nowrap ${
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
                          <p className="text-xs text-stone-400 font-medium font-sans">Vol. Colhido: {data.quantity} {data.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#3a4d39] text-sm font-mono">
                            {data.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-xxs text-stone-400 font-sans">Participação: {percentage.toFixed(1)}%</p>
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

      {/* 2. CUSTOS DETALHADOS POR HECTARE */}
      {(activeSubTab === 'per_hectare' || window.matchMedia('print').matches) && (
        <div className={`space-y-6 ${activeSubTab !== 'per_hectare' ? 'hidden print:block' : ''}`}>
          
          {/* Ações superiores para Custos por Hectare */}
          <div className="flex justify-between items-center bg-stone-50 px-6 py-3.5 rounded-xl border border-stone-200 print:hidden">
            <span className="text-xs font-semibold text-stone-500 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#3a4d39]" />
              Análise e Indicadores de Custo por Hectare (R$/ha)
            </span>
            <div className="flex gap-2">
              <button
                id="export-hectare-csv-btn"
                onClick={exportHectareToCSV}
                className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 px-3.5 py-2 rounded-xl transition-all shadow-xxs cursor-pointer font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#3a4d39]" />
                Exportar CSV
              </button>
              <button
                id="print-hectare-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-3.5 py-2 rounded-xl transition-all shadow-xxs cursor-pointer font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Relatório
              </button>
            </div>
          </div>

          {/* Cards de Métricas por Hectare */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-stone-100 rounded-xl text-stone-700">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium">Área Total Analisada</p>
                <h4 className="text-xl font-serif italic font-bold text-stone-900">
                  {totalAreaHectares.toFixed(2)} <span className="text-xs font-normal text-stone-500">ha</span>
                </h4>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-700">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium">Custo Médio / Hectare</p>
                <h4 className="text-xl font-serif italic font-bold text-rose-800">
                  {custoMedioPorHectare.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs font-normal text-stone-500">/ha</span>
                </h4>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium">Receita Média / Hectare</p>
                <h4 className="text-xl font-serif italic font-bold text-emerald-800">
                  {receitaMediaPorHectare.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs font-normal text-stone-500">/ha</span>
                </h4>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-[#3a4d39]/10 rounded-xl text-[#3a4d39]">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium">Lucro Médio / Hectare</p>
                <h4 className={`text-xl font-serif italic font-bold ${lucroMedioPorHectare >= 0 ? 'text-[#3a4d39]' : 'text-rose-700'}`}>
                  {lucroMedioPorHectare.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs font-normal text-stone-500">/ha</span>
                </h4>
              </div>
            </div>
          </div>

          {/* Tabela 1: Custos de Insumos e Serviços por Hectare (Por Categoria) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-serif italic font-bold text-stone-900 text-base flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#3a4d39]" />
                  Detalhamento de Custos de Insumos e Serviços por Hectare
                </h4>
                <p className="text-xs text-stone-500">Valores consolidados em cada hectare de terra cultivada</p>
              </div>
              <span className="text-xs font-mono bg-stone-100 px-3 py-1 rounded-full text-stone-600 font-semibold">
                Área de referência: {totalAreaHectares.toFixed(2)} ha
              </span>
            </div>

            {categoryHectareData.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-sm">
                Nenhum custo registrado para o filtro selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider font-bold border-b border-stone-200 text-[10px]">
                      <th className="py-3 px-4">Categoria de Insumo / Serviço</th>
                      <th className="py-3 px-4 text-right">Custo Total (R$)</th>
                      <th className="py-3 px-4 text-right">Custo por Hectare (R$/ha)</th>
                      <th className="py-3 px-4 text-right">Participação (%)</th>
                      <th className="py-3 px-4">Representação Visão Geral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans">
                    {categoryHectareData.map(item => (
                      <tr key={item.category} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-850 text-sm">
                          {item.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-700">
                          {item.totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#3a4d39] bg-stone-50/50">
                          {item.perHa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[10px] text-stone-400 font-normal">/ha</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                          {item.percentage.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-[#3a4d39] h-2.5 rounded-full" 
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Linha Totalizadora */}
                    <tr className="bg-stone-50/80 font-bold text-stone-900 border-t-2 border-stone-200">
                      <td className="py-3.5 px-4 uppercase tracking-wider text-xs">Total Consolidado</td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm text-stone-800">
                        {totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-base text-[#3a4d39]">
                        {custoMedioPorHectare.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs text-stone-500 font-normal">/ha</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">100%</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabela 2: Custo por Hectare Detalhado por Talhão / Ciclo Produtivo */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h4 className="font-serif italic font-bold text-stone-900 text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#3a4d39]" />
                Comparativo de Custo por Hectare Entre Talhões e Ciclos
              </h4>
              <p className="text-xs text-stone-500">Mapeamento direto de quanto cada talhão utilizou em insumos e operações por hectare</p>
            </div>

            {cycleHectareBreakdown.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                Nenhum ciclo produtivo encontrado para a área selecionada.
              </div>
            ) : (
              <div className="space-y-4">
                {cycleHectareBreakdown.map(item => (
                  <div key={item.cycle.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-200 pb-2">
                      <div>
                        <span className="font-bold font-serif italic text-stone-900 text-base">{item.cycle.name}</span>
                        <span className="text-xs text-stone-500 ml-2 font-medium">
                          (Talhão: <b>{item.plot?.name || item.cycle.plotName}</b> — Área: <b>{item.plotSize} ha</b>)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 uppercase block font-semibold">CUSTO TOTAL NO TALHÃO</span>
                          <span className="font-mono font-bold text-stone-800 text-sm">
                            {item.totalCycleCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="text-right bg-[#3a4d39]/10 px-3 py-1 rounded-lg">
                          <span className="text-[10px] text-[#3a4d39] uppercase block font-bold">CUSTO / HECTARE</span>
                          <span className="font-mono font-extrabold text-[#3a4d39] text-base">
                            {item.cycleCostPerHa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/ha
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quebra de Insumos e Categorias neste Ciclo */}
                    <div>
                      <p className="text-[11px] font-bold uppercase text-stone-400 mb-2">Composição de Insumos neste Hectare:</p>
                      {Object.keys(item.categoryBreakdown).length === 0 ? (
                        <p className="text-xs text-stone-400 italic">Nenhum custo lançado para este ciclo especificamente.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(item.categoryBreakdown).map(([cat, val]) => {
                            const numVal = Number(val);
                            const catPerHa = item.plotSize > 0 ? numVal / item.plotSize : 0;
                            return (
                              <div key={cat} className="bg-white p-2.5 rounded-lg border border-stone-200 text-xs flex justify-between items-center">
                                <span className="font-medium text-stone-700">{cat}:</span>
                                <span className="font-mono font-bold text-stone-900">
                                  {catPerHa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[10px] font-normal text-stone-400">/ha</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
