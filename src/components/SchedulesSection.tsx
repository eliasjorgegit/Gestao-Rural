import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Schedule, Cycle, Plot, SCHEDULE_TYPES } from '../types.ts';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  List, 
  CalendarDays, 
  Sprout, 
  Bell, 
  DollarSign, 
  Check, 
  AlertCircle,
  Tag
} from 'lucide-react';

interface SchedulesSectionProps {
  key?: string | number;
  onRefresh?: () => void;
}

export function SchedulesSection({ onRefresh }: SchedulesSectionProps) {
  const { fetchWithAuth } = useAuth();
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'calendar' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Filter states for list view
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('Adubação');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [description, setDescription] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [costValue, setCostValue] = useState('');

  // Completion modal state
  const [completingSchedule, setCompletingSchedule] = useState<Schedule | null>(null);
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [createCostRecord, setCreateCostRecord] = useState(true);
  const [modalCostValue, setModalCostValue] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resSchedules, resCycles, resPlots] = await Promise.all([
        fetchWithAuth('/api/schedules'),
        fetchWithAuth('/api/cycles'),
        fetchWithAuth('/api/plots'),
      ]);

      if (!resSchedules.ok) throw new Error('Erro ao carregar agendamentos.');
      if (!resCycles.ok) throw new Error('Erro ao carregar ciclos.');
      if (!resPlots.ok) throw new Error('Erro ao carregar talhões.');

      const dataSchedules = await resSchedules.json();
      const dataCycles = await resCycles.json();
      const dataPlots = await resPlots.json();

      setSchedules(dataSchedules);
      setCycles(dataCycles);
      setPlots(dataPlots);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados do calendário de manejo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Calculate Metrics
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let next7DaysCount = 0;
    let completedCount = 0;

    const next7DaysStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })();

    schedules.forEach(s => {
      if (s.status === 'Pendente') {
        if (s.scheduledDate < todayStr) {
          overdueCount++;
        } else if (s.scheduledDate === todayStr) {
          todayCount++;
        } else if (s.scheduledDate > todayStr && s.scheduledDate <= next7DaysStr) {
          next7DaysCount++;
        }
      } else if (s.status === 'Concluído') {
        completedCount++;
      }
    });

    return { overdueCount, todayCount, next7DaysCount, completedCount, total: schedules.length };
  }, [schedules, todayStr]);

  // Filtered schedules for List View
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (statusFilter !== 'todos' && s.status !== statusFilter) return false;
      if (typeFilter !== 'todos' && s.type !== typeFilter) return false;
      if (priorityFilter !== 'todos' && s.priority !== priorityFilter) return false;
      if (startDate && s.scheduledDate < startDate) return false;
      if (endDate && s.scheduledDate > endDate) return false;
      if (selectedDayDate && s.scheduledDate !== selectedDayDate) return false;
      return true;
    });
  }, [schedules, statusFilter, typeFilter, priorityFilter, startDate, endDate, selectedDayDate]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday
  }, [year, month]);

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDayDate(todayStr);
  };

  const resetForm = () => {
    setTitle('');
    setType('Adubação');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setPriority('Média');
    setDescription('');
    setCycleId('');
    setPlotId('');
    setCostValue('');
    setIsAdding(false);
    setEditingSchedule(null);
  };

  const handleEditClick = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setTitle(schedule.title);
    setType(schedule.type);
    setScheduledDate(schedule.scheduledDate);
    setPriority(schedule.priority);
    setDescription(schedule.description || '');
    setCycleId(schedule.cycleId ? schedule.cycleId.toString() : '');
    setPlotId(schedule.plotId ? schedule.plotId.toString() : '');
    setCostValue(schedule.costValue !== null && schedule.costValue !== undefined ? schedule.costValue.toString() : '');
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type || !scheduledDate) {
      setError('Preencha os campos obrigatórios (Título, Tipo e Data Agendada).');
      return;
    }

    try {
      setError(null);
      const payload = {
        title,
        type,
        scheduledDate,
        priority,
        description: description || null,
        cycleId: cycleId ? parseInt(cycleId) : null,
        plotId: plotId ? parseInt(plotId) : null,
        costValue: costValue ? parseFloat(costValue) : null,
      };

      let res;
      if (editingSchedule) {
        res = await fetchWithAuth(`/api/schedules/${editingSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar agendamento.');
      }

      resetForm();
      fetchData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este agendamento de manejo?')) return;
    try {
      setError(null);
      const res = await fetchWithAuth(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir agendamento.');
      fetchData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenCompleteModal = (s: Schedule) => {
    setCompletingSchedule(s);
    setCompletedDate(new Date().toISOString().split('T')[0]);
    setModalCostValue(s.costValue !== null && s.costValue !== undefined ? s.costValue.toString() : '');
    setCreateCostRecord(s.cycleId ? true : false);
  };

  const handleConfirmComplete = async () => {
    if (!completingSchedule) return;
    try {
      setError(null);
      const payload = {
        status: 'Concluído',
        completedDate,
        costValue: modalCostValue ? parseFloat(modalCostValue) : null,
        createCostRecord: createCostRecord && Boolean(modalCostValue && parseFloat(modalCostValue) > 0),
      };

      const res = await fetchWithAuth(`/api/schedules/${completingSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao concluir manejo.');
      }

      setCompletingSchedule(null);
      fetchData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getTypeBadgeColor = (t: string) => {
    if (t.includes('Adubação')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (t.includes('Pulverização')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (t.includes('Irrigação')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (t.includes('Poda')) return 'bg-stone-200 text-stone-800 border-stone-300';
    if (t.includes('Análise')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const getPriorityBadge = (p: string) => {
    if (p === 'Alta') return <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Alta</span>;
    if (p === 'Média') return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Média</span>;
    return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-md">Baixa</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-[#3a4d39] to-[#2c3d2b] rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-amber-200/20 text-amber-200 text-xs px-3 py-1 rounded-full border border-amber-200/30 font-semibold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" /> Programação de Campo & Alertas
            </div>
            <h2 className="font-serif italic text-2xl md:text-3xl font-bold tracking-tight text-stone-100">
              Calendário de Manejo Agrícola
            </h2>
            <p className="text-xs md:text-sm text-stone-300 max-w-xl">
              Programe adubações, pulverizações, irrigações e tratos culturais com alertas visuais e integração direta ao controle de custos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isAdding) resetForm();
                else setIsAdding(true);
              }}
              className="bg-amber-200 hover:bg-amber-100 text-[#3a4d39] font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAdding ? 'Cancelar' : 'Agendar Manejo'}
            </button>
          </div>
        </div>

        {/* METRICS / BANNERS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300" /> Manejos Atrasados
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-rose-300 flex items-baseline gap-2">
              {metrics.overdueCount}
              {metrics.overdueCount > 0 && <span className="text-[10px] bg-rose-500/30 px-2 py-0.5 rounded-full text-rose-200 font-normal">Requer atenção</span>}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-200" /> Para Hoje / 7 Dias
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-amber-200">
              {metrics.todayCount + metrics.next7DaysCount}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Concluídos
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-300">
              {metrics.completedCount}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-sky-200" /> Total Agendados
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-sky-200">
              {metrics.total}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORM: NOVO / EDITAR AGENDAMENTO */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
            <h3 className="font-serif italic font-bold text-stone-900 text-base">
              {editingSchedule ? 'Editar Agendamento de Manejo' : 'Cadastrar Novo Agendamento de Manejo'}
            </h3>
            <button type="button" onClick={resetForm} className="text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Título / Operação Agrícola *
              </label>
              <input
                type="text"
                placeholder="Ex: Pulverização Fungicida Fox ou Adubação NPK 20-00-20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Tipo de Manejo *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
                required
              >
                {SCHEDULE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Data Agendada *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Nível de Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Ciclo Produtivo (Opcional)
              </label>
              <select
                value={cycleId}
                onChange={(e) => {
                  setCycleId(e.target.value);
                  const selectedCycle = cycles.find(c => c.id.toString() === e.target.value);
                  if (selectedCycle) setPlotId(selectedCycle.plotId.toString());
                }}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              >
                <option value="">Nenhum ciclo específico</option>
                {cycles.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name} ({c.plotName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Talhão / Área (Opcional)
              </label>
              <select
                value={plotId}
                onChange={(e) => setPlotId(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              >
                <option value="">Nenhum talhão específico</option>
                {plots.map(p => (
                  <option key={p.id} value={p.id.toString()}>{p.name} ({p.size} ha)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Previsão de Custo R$ (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 450,00"
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Instruções TÉCNICAS / Dosagem / Observações
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Utilizar 200ml/ha com trator de barra a noite. Usar EPI completo."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-semibold hover:bg-stone-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#3a4d39] text-white rounded-xl text-xs font-bold hover:bg-[#2c3d2b] shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {editingSchedule ? 'Atualizar Manejo' : 'Salvar Agendamento'}
            </button>
          </div>
        </form>
      )}

      {/* CONTROLES DE MODO DE VISÃO: CALENDÁRIO OU LISTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="bg-stone-100 p-1 rounded-xl border border-stone-200 flex">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'calendar' ? 'bg-[#3a4d39] text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Visão Calendário Mensal
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list' ? 'bg-[#3a4d39] text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              <List className="w-4 h-4" /> Visão Lista ({schedules.length})
            </button>
          </div>

          {selectedDayDate && (
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
              Filtrado por: <b>{new Date(selectedDayDate + 'T12:00:00').toLocaleDateString('pt-BR')}</b>
              <button onClick={() => setSelectedDayDate(null)} className="hover:text-amber-950 font-bold ml-1 cursor-pointer">✕</button>
            </span>
          )}
        </div>

        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-600 cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-stone-900 font-serif italic capitalize min-w-[140px] text-center">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-600 cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-3 py-1.5 rounded-lg border border-stone-200 cursor-pointer transition-colors"
            >
              Hoje
            </button>
          </div>
        )}
      </div>

      {/* RENDER MODES */}
      {viewMode === 'calendar' ? (
        /* GRID DE CALENDÁRIO */
        <div className="bg-white rounded-3xl border border-stone-200 p-4 md:p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-3">
            <div className="text-rose-600">Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div className="text-stone-400">Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr">
            {/* Empty offset cells before month starts */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] md:min-h-[110px] bg-stone-50/40 rounded-xl border border-dashed border-stone-100" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const monthStr = String(month + 1).padStart(2, '0');
              const dayStr = String(dayNum).padStart(2, '0');
              const dateIso = `${year}-${monthStr}-${dayStr}`;

              const daySchedules = schedules.filter(s => s.scheduledDate === dateIso);
              const isToday = dateIso === todayStr;
              const isSelected = selectedDayDate === dateIso;

              return (
                <div
                  key={dateIso}
                  onClick={() => {
                    if (selectedDayDate === dateIso) setSelectedDayDate(null);
                    else setSelectedDayDate(dateIso);
                  }}
                  className={`min-h-[90px] md:min-h-[110px] p-1.5 md:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3a4d39] bg-[#3a4d39]/5 ring-2 ring-[#3a4d39]/20'
                      : isToday
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                      isToday
                        ? 'bg-amber-400 text-stone-900'
                        : 'text-stone-700'
                    }`}>
                      {dayNum}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-600 px-1.5 rounded-full">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  {/* Task list preview in cell */}
                  <div className="space-y-1 overflow-y-auto max-h-[70px] my-1 pr-0.5 scrollbar-thin">
                    {daySchedules.map(s => {
                      const isOverdue = s.status === 'Pendente' && s.scheduledDate < todayStr;
                      const isDone = s.status === 'Concluído';
                      return (
                        <div
                          key={s.id}
                          className={`text-[10px] font-medium px-1.5 py-1 rounded-md truncate border flex items-center justify-between ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60 line-through opacity-75'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                              : getTypeBadgeColor(s.type)
                          }`}
                          title={`${s.title} (${s.status})`}
                        >
                          <span className="truncate">{s.title}</span>
                          {s.priority === 'Alta' && !isDone && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 ml-1 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[9px] text-stone-400 text-right font-medium">
                    {daySchedules.length === 0 ? '' : 'Clique para ver'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* LISTA DE TAREFAS DE MANEJO */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        
        {/* BARRA DE FILTROS NA LISTA */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-200 pb-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#3a4d39]" />
              Filtrar Lista de Agendamentos
            </span>
            {(statusFilter !== 'todos' || typeFilter !== 'todos' || priorityFilter !== 'todos' || startDate || endDate || selectedDayDate) && (
              <button
                onClick={() => {
                  setStatusFilter('todos');
                  setTypeFilter('todos');
                  setPriorityFilter('todos');
                  setStartDate('');
                  setEndDate('');
                  setSelectedDayDate(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Limpar Todos os Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              >
                <option value="todos">Todos os Status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Concluído">Concluídos</option>
                <option value="Cancelado">Cancelados</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Tipo de Manejo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              >
                <option value="todos">Todos os Tipos</option>
                {SCHEDULE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Prioridade
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              >
                <option value="todos">Todas as Prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Data De
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Data Até
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#3a4d39]"
              />
            </div>
          </div>
        </div>

        {/* TABELA / CARDS DE MANEJO */}
        {filteredSchedules.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-2">
            <CalendarDays className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-stone-700">Nenhum agendamento de manejo encontrado.</p>
            <p className="text-xs text-stone-400">Ajuste os filtros ou crie um novo agendamento clicando no botão "Agendar Manejo" acima.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSchedules.map((s) => {
              const isOverdue = s.status === 'Pendente' && s.scheduledDate < todayStr;
              const isToday = s.scheduledDate === todayStr;
              const isDone = s.status === 'Concluído';

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    isDone
                      ? 'bg-stone-50/80 border-stone-200 opacity-80'
                      : isOverdue
                      ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                      : isToday
                      ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getTypeBadgeColor(s.type)}`}>
                        {s.type}
                      </span>
                      {getPriorityBadge(s.priority)}
                      
                      {isDone ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Concluído em {new Date((s.completedDate || s.scheduledDate) + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : isOverdue ? (
                        <span className="bg-rose-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <AlertTriangle className="w-3 h-3" /> Atrasado ({new Date(s.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')})
                        </span>
                      ) : isToday ? (
                        <span className="bg-amber-400 text-stone-900 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Para Hoje!
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500 font-mono font-semibold bg-stone-100 px-2 py-0.5 rounded-md">
                          Data: {new Date(s.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-base font-bold font-serif italic ${isDone ? 'line-through text-stone-600' : 'text-stone-900'}`}>
                      {s.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-600">
                      {(s.plotName || s.cycleName) && (
                        <span className="flex items-center gap-1 font-medium">
                          <Sprout className="w-3.5 h-3.5 text-[#3a4d39]" />
                          {s.plotName && <b>Talhão: {s.plotName}</b>}
                          {s.cycleName && <span className="text-stone-400">• Ciclo: {s.cycleName}</span>}
                        </span>
                      )}

                      {s.costValue !== null && s.costValue !== undefined && s.costValue > 0 && (
                        <span className="flex items-center gap-1 font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                          <DollarSign className="w-3 h-3 text-[#3a4d39]" />
                          Previsão Custo: {s.costValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </div>

                    {s.description && (
                      <p className="text-xs text-stone-500 italic bg-stone-50/80 p-2 rounded-xl border border-stone-100 mt-1">
                        "{s.description}"
                      </p>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!isDone && (
                      <button
                        onClick={() => handleOpenCompleteModal(s)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Marcar como Concluído"
                      >
                        <Check className="w-4 h-4" /> Concluir
                      </button>
                    )}

                    <button
                      onClick={() => handleEditClick(s)}
                      className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                      title="Editar Agendamento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE CONCLUSÃO DE MANEJO */}
      {completingSchedule && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 border border-stone-200">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif italic font-bold text-base text-stone-900">
                  Concluir Manejo Agrícola
                </h3>
              </div>
              <button onClick={() => setCompletingSchedule(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <p>
                Confirmar a conclusão do manejo: <b className="text-stone-900">{completingSchedule.title}</b>.
              </p>

              <div>
                <label className="block font-semibold uppercase text-stone-500 text-[10px] mb-1">
                  Data Efetiva de Realização *
                </label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-stone-500 text-[10px] mb-1">
                  Valor Real do Custo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 450,00"
                  value={modalCostValue}
                  onChange={(e) => setModalCostValue(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              {completingSchedule.cycleId && (
                <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createCostRecord}
                      onChange={(e) => setCreateCostRecord(e.target.checked)}
                      className="mt-0.5 rounded-sm border-emerald-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-emerald-900 block">
                        Lançar valor no módulo de Custos Agrícolas?
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Gera automaticamente um lançamento de despesa vinculado ao ciclo <b>{completingSchedule.cycleName}</b>.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCompletingSchedule(null)}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Finalizar & Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
