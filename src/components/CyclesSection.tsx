import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Cycle, Plot, Activity } from '../types.ts';
import { 
  CalendarDays, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  PlayCircle, 
  CheckCircle2, 
  Archive, 
  History, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sprout, 
  Filter,
  BarChart3
} from 'lucide-react';

interface CyclesSectionProps {
  onRefresh?: () => void;
}

export const CyclesSection: React.FC<CyclesSectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'actives' | 'archived'
  const [viewTab, setViewTab] = useState<'actives' | 'archived'>('actives');
  const [yearFilter, setYearFilter] = useState<string>('todos');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<Cycle | null>(null);

  const [plotId, setPlotId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Ativo');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCycles, resPlots, resActivities, resCosts, resHarvests] = await Promise.all([
        fetchWithAuth('/api/cycles'),
        fetchWithAuth('/api/plots'),
        fetchWithAuth('/api/activities'),
        fetchWithAuth('/api/costs'),
        fetchWithAuth('/api/harvests'),
      ]);

      if (resCycles.ok && resPlots.ok && resActivities.ok) {
        setCycles(await resCycles.json());
        setPlots(await resPlots.json());
        setActivities(await resActivities.json());
        if (resCosts.ok) setCosts(await resCosts.json());
        if (resHarvests.ok) setHarvests(await resHarvests.json());
      } else {
        setError('Erro ao carregar dados dos ciclos produtivos.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setPlotId('');
    setActivityId('');
    setName('');
    setStartDate('');
    setEndDate('');
    setStatus('Ativo');
    setIsAdding(false);
    setEditingCycle(null);
  };

  const handleEditClick = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setPlotId(cycle.plotId.toString());
    setActivityId(cycle.activityId.toString());
    setName(cycle.name);
    setStartDate(cycle.startDate);
    setEndDate(cycle.endDate);
    setStatus(cycle.status);
    setIsAdding(false);
  };

  const handleQuickChangeStatus = async (cycle: Cycle, newStatus: string) => {
    try {
      const payload = {
        plotId: cycle.plotId,
        activityId: cycle.activityId,
        name: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: newStatus,
      };

      const res = await fetchWithAuth(`/api/cycles/${cycle.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao alterar status do ciclo.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar ao servidor.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plotId || !activityId || !name.trim() || !startDate || !endDate) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const payload = {
        plotId: parseInt(plotId),
        activityId: parseInt(activityId),
        name: name.trim(),
        startDate,
        endDate,
        status,
      };

      if (editingCycle) {
        const res = await fetchWithAuth(`/api/cycles/${editingCycle.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao editar ciclo produtivo.');
        }
      } else {
        const res = await fetchWithAuth('/api/cycles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao criar ciclo produtivo.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/cycles/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCycles(cycles.filter(c => c.id !== id));
        setDeletingCycle(null);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao remover ciclo produtivo.');
        setDeletingCycle(null);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar.');
      setDeletingCycle(null);
    }
  };

  // Filter cycles
  const activeCycles = useMemo(() => {
    return cycles.filter(c => c.status === 'Ativo');
  }, [cycles]);

  const archivedCyclesAll = useMemo(() => {
    return cycles.filter(c => c.status !== 'Ativo');
  }, [cycles]);

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    archivedCyclesAll.forEach(c => {
      if (c.startDate) yearsSet.add(c.startDate.substring(0, 4));
      if (c.endDate) yearsSet.add(c.endDate.substring(0, 4));
    });
    return Array.from(yearsSet).sort().reverse();
  }, [archivedCyclesAll]);

  const archivedCyclesFiltered = useMemo(() => {
    if (yearFilter === 'todos') return archivedCyclesAll;
    return archivedCyclesAll.filter(c => 
      (c.startDate && c.startDate.startsWith(yearFilter)) ||
      (c.endDate && c.endDate.startsWith(yearFilter))
    );
  }, [archivedCyclesAll, yearFilter]);

  // Helper to calculate cycle metrics
  const getCycleMetrics = (cycleId: number, plotId: number) => {
    const cycleCosts = costs.filter(c => c.cycleId === cycleId);
    const cycleHarvests = harvests.filter(h => h.cycleId === cycleId);

    const totalCost = cycleCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
    const totalHarvestQuantity = cycleHarvests.reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);
    const totalHarvestRevenue = cycleHarvests.reduce((acc, h) => acc + ((Number(h.quantity) || 0) * (Number(h.pricePerUnit) || 0)), 0);

    const plot = plots.find(p => p.id === plotId);
    const plotArea = plot?.size || 0;
    const productivity = plotArea > 0 && totalHarvestQuantity > 0 ? (totalHarvestQuantity / plotArea).toFixed(2) : null;
    const netProfit = totalHarvestRevenue - totalCost;

    const mainUnit = cycleHarvests.length > 0 ? cycleHarvests[0].unit : 'unidades';

    return {
      totalCost,
      totalHarvestQuantity,
      totalHarvestRevenue,
      plotArea,
      productivity,
      netProfit,
      mainUnit,
      harvestCount: cycleHarvests.length
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-[#3a4d39] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-amber-200" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Ciclos Produtivos & Histórico de Safras</h2>
            <p className="text-xs text-stone-300">Acompanhe lavouras ativas ou consulte fechamentos de safras passadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs: Ativos / Histórico */}
          <div className="bg-[#2c3a2b] p-1 rounded-xl flex gap-1 border border-white/10">
            <button
              onClick={() => setViewTab('actives')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewTab === 'actives'
                  ? 'bg-amber-200 text-[#3a4d39] shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Ativos ({activeCycles.length})
            </button>
            <button
              onClick={() => setViewTab('archived')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewTab === 'archived'
                  ? 'bg-amber-200 text-[#3a4d39] shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Histórico ({archivedCyclesAll.length})
            </button>
          </div>

          {!isAdding && !editingCycle && plots.length > 0 && activities.length > 0 && (
            <button
              id="add-cycle-btn-trigger"
              onClick={() => { resetForm(); setIsAdding(true); setViewTab('actives'); }}
              className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-xl transition-all cursor-pointer font-medium ml-2"
            >
              <Plus className="w-4 h-4" />
              Novo Ciclo
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {plots.length === 0 || activities.length === 0 ? (
          <div className="text-center py-8 bg-[#ece3ce]/25 border border-[#d2c49a]/60 rounded-2xl p-6">
            <AlertTriangle className="w-8 h-8 text-stone-500 mx-auto mb-2" />
            <p className="text-sm font-serif italic font-bold text-stone-850">Pré-requisitos ausentes</p>
            <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
              Você precisa cadastrar pelo menos um **Talhão** e uma **Atividade** no catálogo antes de criar um ciclo produtivo.
            </p>
          </div>
        ) : (
          <>
            {/* Form Modal / Area */}
            {(isAdding || editingCycle) && (
              <form onSubmit={handleSubmit} className="mb-6 p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 shadow-xs">
                <h3 className="font-serif italic font-bold text-stone-850 text-base">
                  {editingCycle ? 'Editar Ciclo Produtivo' : 'Cadastrar Novo Ciclo Produtivo'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Identificação (Safra/Lote)
                    </label>
                    <input
                      id="cycle-name-input"
                      type="text"
                      placeholder="Ex: Safra Milho 2026/2027"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Selecione o Talhão
                    </label>
                    <select
                      id="cycle-plot-select"
                      value={plotId}
                      onChange={(e) => setPlotId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    >
                      <option value="">-- Escolher Talhão --</option>
                      {plots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.size} ha)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Selecione a Atividade
                    </label>
                    <select
                      id="cycle-activity-select"
                      value={activityId}
                      onChange={(e) => setActivityId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    >
                      <option value="">-- Escolher Atividade --</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Data Inicial (Plantio)
                    </label>
                    <input
                      id="cycle-start-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Data Final Prevista/Fechamento
                    </label>
                    <input
                      id="cycle-end-input"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Status do Ciclo
                    </label>
                    <select
                      id="cycle-status-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    >
                      <option value="Ativo">Ativo (Em Produção)</option>
                      <option value="Concluído">Concluído (Arquivar no Histórico)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    id="cancel-cycle-form"
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-cycle-form"
                    type="submit"
                    className="flex items-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-5 py-2 text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Ciclo
                  </button>
                </div>
              </form>
            )}

            {/* Content loading state */}
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#3a4d39]"></div>
              </div>
            ) : viewTab === 'actives' ? (
              /* TAB 1: CICLOS ATIVOS */
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-200/80">
                  <span className="text-xs text-stone-600 font-medium flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-[#3a4d39]" />
                    Lavouras e Cultivos em Andamento
                  </span>
                  <span className="text-xs font-bold text-stone-800 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                    {activeCycles.length} {activeCycles.length === 1 ? 'Ciclo Ativo' : 'Ciclos Ativos'}
                  </span>
                </div>

                {activeCycles.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                    <Sprout className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                    <p className="text-sm font-serif italic text-stone-700 font-bold">Nenhum ciclo ativo no momento</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Crie um novo ciclo clicando em "Novo Ciclo" ou consulte o **Histórico** para ver safras passadas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCycles.map((cycle) => {
                      const metrics = getCycleMetrics(cycle.id, cycle.plotId);
                      return (
                        <div 
                          key={cycle.id} 
                          className="p-5 border rounded-2xl transition-all bg-[#ece3ce]/15 border-[#d2c49a]/60 hover:bg-white hover:shadow-md flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-serif italic font-bold text-stone-850 text-lg leading-tight">{cycle.name}</h4>
                                <div className="flex flex-wrap gap-2 items-center mt-1.5">
                                  <span className="text-xs bg-white border border-stone-200 text-stone-700 font-semibold px-2 py-0.5 rounded-lg">
                                    Talhão: {cycle.plotName} ({metrics.plotArea} ha)
                                  </span>
                                  <span className="text-xs bg-white border border-stone-200 text-stone-700 font-semibold px-2 py-0.5 rounded-lg">
                                    Cultura: {cycle.activityName}
                                  </span>
                                </div>
                              </div>
                              <span className="flex items-center gap-1 bg-[#ece3ce] text-[#3a4d39] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#d2c49a]/40">
                                <PlayCircle className="w-3.5 h-3.5 text-[#3a4d39]" />
                                Ativo
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4 bg-white/80 p-3 rounded-xl border border-stone-200/50 text-xs">
                              <div>
                                <p className="text-xxs font-semibold text-stone-400 uppercase tracking-wider">Início</p>
                                <p className="font-medium text-stone-800 font-mono">
                                  {new Date(cycle.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xxs font-semibold text-stone-400 uppercase tracking-wider">Previsão Colheita</p>
                                <p className="font-medium text-stone-800 font-mono">
                                  {new Date(cycle.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xxs font-semibold text-stone-400 uppercase tracking-wider">Custos Lançados</p>
                                <p className="font-bold text-amber-900 font-mono">
                                  R$ {metrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xxs font-semibold text-stone-400 uppercase tracking-wider">Colheitas Registradas</p>
                                <p className="font-bold text-emerald-800 font-mono">
                                  {metrics.totalHarvestQuantity.toLocaleString('pt-BR')} {metrics.mainUnit}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-stone-200/60">
                            <button
                              onClick={() => handleQuickChangeStatus(cycle, 'Concluído')}
                              className="flex items-center gap-1 text-xs bg-[#3a4d39] hover:bg-[#2c3a2b] text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium shadow-2xs"
                              title="Encerrar e arquivar esta safra no histórico"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Encerrar Safra
                            </button>

                            <div className="flex gap-1">
                              <button
                                id={`edit-cycle-btn-${cycle.id}`}
                                onClick={() => handleEditClick(cycle)}
                                className="flex items-center gap-1 text-xs text-stone-500 hover:text-[#3a4d39] px-2.5 py-1.5 hover:bg-[#ece3ce]/60 rounded-lg transition-all cursor-pointer font-medium"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button
                                id={`delete-cycle-btn-${cycle.id}`}
                                onClick={() => setDeletingCycle(cycle)}
                                className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 px-2.5 py-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: HISTÓRICO DE SAFRAS E CICLOS ARQUIVADOS */
              <div className="space-y-4">
                {/* Filter bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-stone-50 p-3 rounded-xl border border-stone-200 gap-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#3a4d39]" />
                    <span className="text-xs font-bold text-stone-800">
                      Histórico e Fechamentos de Safras ({archivedCyclesFiltered.length})
                    </span>
                  </div>

                  {availableYears.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Filter className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-stone-600 font-medium">Filtrar por Ano:</span>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none"
                      >
                        <option value="todos">Todos os Anos</option>
                        {availableYears.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {archivedCyclesFiltered.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                    <Archive className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                    <p className="text-sm font-serif italic text-stone-700 font-bold">Nenhum ciclo no histórico</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Ao concluir ou fechar um ciclo ativo, ele aparecerá aqui com seu balanço financeiro e métricas de produção.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {archivedCyclesFiltered.map((cycle) => {
                      const metrics = getCycleMetrics(cycle.id, cycle.plotId);
                      return (
                        <div 
                          key={cycle.id} 
                          className="p-5 border rounded-2xl bg-stone-50/90 border-stone-200 hover:border-stone-300 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-serif italic font-bold text-stone-900 text-lg leading-tight">{cycle.name}</h4>
                                <div className="flex flex-wrap gap-2 items-center mt-1.5">
                                  <span className="text-xs bg-stone-200/60 text-stone-700 font-semibold px-2 py-0.5 rounded-lg border border-stone-200">
                                    Talhão: {cycle.plotName} ({metrics.plotArea} ha)
                                  </span>
                                  <span className="text-xs bg-stone-200/60 text-stone-700 font-semibold px-2 py-0.5 rounded-lg border border-stone-200">
                                    Cultura: {cycle.activityName}
                                  </span>
                                </div>
                              </div>
                              <span className="flex items-center gap-1 bg-stone-200 text-stone-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-stone-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" />
                                Finalizado
                              </span>
                            </div>

                            {/* Fechamento Operacional & Financeiro */}
                            <div className="mt-4 bg-white p-3.5 rounded-xl border border-stone-200 space-y-3">
                              <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b border-stone-100">
                                <div>
                                  <span className="text-xxs uppercase tracking-wider text-stone-400 font-semibold">Período</span>
                                  <p className="font-mono text-stone-700 font-medium">
                                    {new Date(cycle.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(cycle.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xxs uppercase tracking-wider text-stone-400 font-semibold">Produtividade Média</span>
                                  <p className="font-bold text-stone-800">
                                    {metrics.productivity ? `${metrics.productivity} ${metrics.mainUnit}/ha` : 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-xxs uppercase tracking-wider text-stone-400 font-semibold">Custos</span>
                                  <p className="font-bold text-amber-800 font-mono">
                                    R$ {metrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xxs uppercase tracking-wider text-stone-400 font-semibold">Receitas</span>
                                  <p className="font-bold text-emerald-800 font-mono">
                                    R$ {metrics.totalHarvestRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xxs uppercase tracking-wider text-stone-400 font-semibold">Resultado</span>
                                  <p className={`font-bold font-mono flex items-center gap-0.5 ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {metrics.netProfit >= 0 ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
                                    R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-200">
                            <button
                              onClick={() => handleQuickChangeStatus(cycle, 'Ativo')}
                              className="flex items-center gap-1.5 text-xs text-[#3a4d39] hover:bg-[#ece3ce]/60 px-3 py-1.5 rounded-xl border border-[#d2c49a]/70 transition-all cursor-pointer font-semibold"
                              title="Reabrir este ciclo para que ele volte aos Ativos"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#3a4d39]" />
                              Reabrir Ciclo
                            </button>

                            <div className="flex gap-1">
                              <button
                                id={`edit-cycle-btn-${cycle.id}`}
                                onClick={() => handleEditClick(cycle)}
                                className="flex items-center gap-1 text-xs text-stone-500 hover:text-[#3a4d39] px-2.5 py-1.5 hover:bg-stone-100 rounded-lg transition-all cursor-pointer font-medium"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button
                                id={`delete-cycle-btn-${cycle.id}`}
                                onClick={() => setDeletingCycle(cycle)}
                                className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 px-2.5 py-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CICLO */}
      {deletingCycle && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Excluir Ciclo Produtivo</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Deseja realmente remover o ciclo <strong className="font-bold text-stone-900">"{deletingCycle.name}"</strong>?
            </p>
            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200/80">
              <b>Atenção:</b> Esta ação apagará todos os lançamentos de custo e produção vinculados a este ciclo!
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-delete-cycle-btn"
                onClick={() => setDeletingCycle(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-cycle-btn"
                onClick={() => handleDelete(deletingCycle.id)}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
