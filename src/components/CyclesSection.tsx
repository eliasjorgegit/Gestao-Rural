import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Cycle, Plot, Activity } from '../types.ts';
import { CalendarDays, Plus, Edit2, Trash2, Save, X, AlertTriangle, PlayCircle, CheckCircle2 } from 'lucide-react';

interface CyclesSectionProps {
  onRefresh?: () => void;
}

export const CyclesSection: React.FC<CyclesSectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  const [plotId, setPlotId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Ativo');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCycles, resPlots, resActivities] = await Promise.all([
        fetchWithAuth('/api/cycles'),
        fetchWithAuth('/api/plots'),
        fetchWithAuth('/api/activities'),
      ]);

      if (resCycles.ok && resPlots.ok && resActivities.ok) {
        setCycles(await resCycles.json());
        setPlots(await resPlots.json());
        setActivities(await resActivities.json());
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
        // Edit
        const res = await fetchWithAuth(`/api/cycles/${editingCycle.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData(); // Easiest way to reload join details
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao editar ciclo produtivo.');
        }
      } else {
        // Add
        const res = await fetchWithAuth('/api/cycles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData(); // Easiest way to reload join details
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
    if (!confirm('Deseja realmente remover este ciclo produtivo? Isso apagará todos os lançamentos de custo e produção vinculados.')) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/cycles/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCycles(cycles.filter(c => c.id !== id));
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao remover ciclo produtivo.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-[#3a4d39] text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-amber-200" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Ciclos Produtivos (Safras/Lotes)</h2>
            <p className="text-xs text-stone-300">Vincule talhões com atividades e períodos de colheita</p>
          </div>
        </div>
        {!isAdding && !editingCycle && plots.length > 0 && activities.length > 0 && (
          <button
            id="add-cycle-btn-trigger"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Ciclo
          </button>
        )}
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
            {(isAdding || editingCycle) && (
              <form onSubmit={handleSubmit} className="mb-6 p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
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
                      placeholder="Ex: Safra 2026/2027, Lote Sul"
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
                      Data Inicial
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
                      Data Final Prevista
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
                      <option value="Concluído">Concluído (Colhido/Fechado)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
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

            {loading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3a4d39]"></div>
              </div>
            ) : cycles.length === 0 ? (
              <div className="text-center py-10 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-sans">Nenhum ciclo produtivo cadastrado ainda.</p>
                <p className="text-xs text-stone-400 mt-1">Crie um ciclo clicando em "Novo Ciclo" acima.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cycles.map((cycle) => (
                  <div 
                    key={cycle.id} 
                    className={`p-5 border rounded-2xl transition-all flex flex-col justify-between ${
                      cycle.status === 'Concluído' 
                        ? 'bg-stone-50 border-stone-200 opacity-80 hover:opacity-100' 
                        : 'bg-[#ece3ce]/15 border-[#d2c49a]/60 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-serif italic font-bold text-stone-850 text-lg leading-tight">{cycle.name}</h4>
                          <div className="flex gap-2 items-center mt-1.5">
                            <span className="text-xs bg-stone-100 border border-stone-200 text-stone-600 font-semibold px-2 py-0.5 rounded-lg">
                              Talhão: {cycle.plotName}
                            </span>
                            <span className="text-xs bg-stone-100 border border-stone-200 text-stone-600 font-semibold px-2 py-0.5 rounded-lg">
                              Cultura: {cycle.activityName}
                            </span>
                          </div>
                        </div>
                        {cycle.status === 'Concluído' ? (
                          <span className="flex items-center gap-1 bg-stone-200 text-stone-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-stone-300/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                            Concluído
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-[#ece3ce] text-[#3a4d39] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#d2c49a]/40">
                            <PlayCircle className="w-3.5 h-3.5 text-[#3a4d39]" />
                            Ativo
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 bg-white/60 p-3 rounded-xl border border-stone-200/40">
                        <div>
                          <p className="text-xxs font-semibold text-stone-400 uppercase tracking-wider">Início</p>
                          <p className="text-sm font-medium text-stone-700 font-mono">
                            {new Date(cycle.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xxs font-semibold text-stone-400 uppercase tracking-wider">Término Previsto</p>
                          <p className="text-sm font-medium text-stone-700 font-mono">
                            {new Date(cycle.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-stone-100">
                      <button
                        id={`edit-cycle-btn-${cycle.id}`}
                        onClick={() => handleEditClick(cycle)}
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-[#3a4d39] px-2.5 py-1 hover:bg-[#ece3ce]/60 rounded-lg transition-all cursor-pointer font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        id={`delete-cycle-btn-${cycle.id}`}
                        onClick={() => handleDelete(cycle.id)}
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 px-2.5 py-1 hover:bg-red-50 rounded-lg transition-all cursor-pointer font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
