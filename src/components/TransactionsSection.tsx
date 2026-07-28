import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Transaction, Cycle } from '../types';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  DollarSign,
  ArrowRightLeft
} from 'lucide-react';

export const TransactionsSection: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs for Payable vs Receivable
  const [viewTab, setViewTab] = useState<'all' | 'payable' | 'receivable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('todos'); // e.g., '2026-07'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [linkingTx, setLinkingTx] = useState<Transaction | null>(null);
  const [linkCycleId, setLinkCycleId] = useState('');
  const [linkQuantity, setLinkQuantity] = useState('');
  const [linkUnit, setLinkUnit] = useState('kg');
  const [linkSuccessMsg, setLinkSuccessMsg] = useState<string | null>(null);

  const handleLink = async () => {
    if (!linkingTx) return;
    try {
      const payload: any = { cycleId: linkCycleId };
      if (linkingTx.type === 'receivable') {
        payload.quantity = linkQuantity;
        payload.unit = linkUnit;
      }
      const res = await fetchWithAuth(`/api/transactions/${linkingTx.id}/link`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setLinkSuccessMsg(data.message);
        setTimeout(() => setLinkSuccessMsg(null), 3000);
        setLinkingTx(null);
      } else {
        setError(data.error || 'Erro ao vincular transação.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    }
  };


  // Form values
  const [type, setType] = useState<'payable' | 'receivable'>('payable');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [category, setCategory] = useState('');
  const [cycleId, setCycleId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTx, resCycles] = await Promise.all([
        fetchWithAuth('/api/transactions'),
        fetchWithAuth('/api/cycles'),
      ]);

      if (resTx.ok && resCycles.ok) {
        setTransactions(await resTx.json());
        setCycles(await resCycles.json());
      } else {
        setError('Erro ao carregar transações financeiras.');
      }
    } catch (err) {
      setError('Erro de conexão ao carregar transações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditingTx(null);
    setType('payable');
    setDescription('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setPaymentDate('');
    setStatus('pending');
    setCategory('');
    setCycleId('');
    setError(null);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setType(tx.type);
    setDescription(tx.description);
    setAmount(tx.amount.toString());
    setDueDate(tx.dueDate);
    setPaymentDate(tx.paymentDate || '');
    setStatus(tx.status);
    setCategory(tx.category || '');
    setCycleId(tx.cycleId ? tx.cycleId.toString() : '');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!description || !amount || !dueDate) {
      setError("Preencha descrição, valor e data de vencimento.");
      return;
    }

    try {
      const payload = {
        type,
        description,
        amount: parseFloat(String(amount).replace(",", ".")),
        dueDate,
        paymentDate: paymentDate || null,
        status,
        category: category || null,
        cycleId: cycleId ? parseInt(cycleId) : null,
      };

      if (editingTx) {
        const res = await fetchWithAuth(`/api/transactions/${editingTx.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          setIsAdding(false);
          resetForm();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao editar transação.');
        }
      } else {
        const res = await fetchWithAuth('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          setIsAdding(false);
          resetForm();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao adicionar transação.');
        }
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
        setDeletingTx(null);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao excluir transação.');
        setDeletingTx(null);
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
      setDeletingTx(null);
    }
  };

  const toggleStatus = async (tx: Transaction) => {
    try {
      const newStatus = tx.status === 'pending' ? 'paid' : 'pending';
      const newPaymentDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

      const payload = {
        type: tx.type,
        description: tx.description,
        amount: tx.amount,
        dueDate: tx.dueDate,
        paymentDate: newPaymentDate,
        status: newStatus,
        category: tx.category,
        cycleId: tx.cycleId,
      };

      const res = await fetchWithAuth(`/api/transactions/${tx.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao alterar status.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    }
  };

  // Extract available months for filter
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.dueDate) monthsSet.add(t.dueDate.substring(0, 7)); // YYYY-MM
    });
    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = viewTab === 'all' ? true : t.type === viewTab;
      const matchStatus = statusFilter === 'all' ? true : t.status === statusFilter;
      const matchMonth = monthFilter === 'todos' ? true : t.dueDate.startsWith(monthFilter);
      const matchStartDate = !startDate || t.dueDate >= startDate;
      const matchEndDate = !endDate || t.dueDate <= endDate;
      return matchType && matchStatus && matchMonth && matchStartDate && matchEndDate;
    });
  }, [transactions, viewTab, statusFilter, monthFilter, startDate, endDate]);

  // Totals calculations based on CURRENT filter
  const metrics = useMemo(() => {
    let totalPayable = 0;
    let totalReceivable = 0;
    let paidPayable = 0;
    let paidReceivable = 0;

    filteredTransactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'payable') {
        totalPayable += amount;
        if (t.status === 'paid') paidPayable += amount;
      } else {
        totalReceivable += amount;
        if (t.status === 'paid') paidReceivable += amount;
      }
    });

    const expectedBalance = totalReceivable - totalPayable;
    const realizedBalance = paidReceivable - paidPayable;

    return {
      totalPayable,
      totalReceivable,
      paidPayable,
      paidReceivable,
      expectedBalance,
      realizedBalance,
    };
  }, [filteredTransactions]);

  const activeCycles = cycles.filter(c => c.status === 'Ativo');

  const formatMonth = (yyyyMm: string) => {
    const [year, month] = yyyyMm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-stone-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Contas a Pagar e Receber</h2>
            <p className="text-xs text-stone-300">Acompanhe seu fluxo de caixa e compromissos</p>
          </div>
        </div>

        {!isAdding && (
          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition-all cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-6 p-5 bg-stone-50 border border-stone-200 rounded-2xl shadow-xs">
            <h3 className="font-serif italic font-bold text-stone-800 text-base mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              {editingTx ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Tipo de Lançamento
                </label>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all ${type === 'payable' ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold shadow-xs' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                    <input 
                      type="radio" 
                      name="txType" 
                      value="payable" 
                      checked={type === 'payable'} 
                      onChange={() => setType('payable')} 
                      className="hidden"
                    />
                    <TrendingDown className="w-4 h-4" />
                    Conta a Pagar
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all ${type === 'receivable' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                    <input 
                      type="radio" 
                      name="txType" 
                      value="receivable" 
                      checked={type === 'receivable'} 
                      onChange={() => setType('receivable')} 
                      className="hidden"
                    />
                    <TrendingUp className="w-4 h-4" />
                    Conta a Receber
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Descrição / Fornecedor / Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra de Fertilizantes, Venda Lote Sul..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Data de Vencimento / Previsão
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Categoria (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Insumos, Manutenção, Receita de Venda"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Vincular Ciclo Produtivo (Opcional)
                </label>
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                >
                  <option value="">Nenhum vínculo</option>
                  {activeCycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.activityName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as 'pending' | 'paid');
                    if (e.target.value === 'pending') setPaymentDate('');
                    else if (!paymentDate) setPaymentDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">{type === 'payable' ? 'Pago' : 'Recebido'}</option>
                </select>
              </div>

              {status === 'paid' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    Data do Pagamento/Recebimento
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-900 text-sm font-sans bg-white"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-200 bg-stone-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-bold bg-stone-900 hover:bg-stone-900 text-white rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                {editingTx ? 'Salvar Alterações' : 'Salvar Lançamento'}
              </button>
            </div>
          </form>
        )}

        {/* Dashboard / Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> A Pagar (Filtro Atual)
            </p>
            <p className="text-2xl font-mono font-bold text-rose-700 leading-tight">
              R$ {metrics.totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-rose-500 mt-1">
              Já pago: R$ {metrics.paidPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> A Receber (Filtro Atual)
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-700 leading-tight">
              R$ {metrics.totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-500 mt-1">
              Já recebido: R$ {metrics.paidReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className={`border rounded-2xl p-4 ${metrics.expectedBalance >= 0 ? 'bg-sky-50 border-sky-100' : 'bg-orange-50 border-orange-100'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${metrics.expectedBalance >= 0 ? 'text-sky-700' : 'text-orange-700'}`}>
              <Wallet className="w-4 h-4" /> Saldo Previsto
            </p>
            <p className={`text-2xl font-mono font-bold leading-tight ${metrics.expectedBalance >= 0 ? 'text-sky-800' : 'text-orange-800'}`}>
              R$ {metrics.expectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 ${metrics.expectedBalance >= 0 ? 'text-sky-600' : 'text-orange-600'}`}>
              Saldo Realizado: R$ {metrics.realizedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-200/80 pb-3">
            <div className="flex bg-white p-1 rounded-lg border border-stone-200 shadow-2xs">
              <button
                onClick={() => setViewTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewTab === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setViewTab('payable')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${viewTab === 'payable' ? 'bg-rose-100 text-rose-800' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                A Pagar
              </button>
              <button
                onClick={() => setViewTab('receivable')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${viewTab === 'receivable' ? 'bg-emerald-100 text-emerald-800' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                A Receber
              </button>
            </div>

            {(startDate || endDate || monthFilter !== 'todos' || statusFilter !== 'all' || viewTab !== 'all') && (
              <button
                onClick={() => {
                  setViewTab('all');
                  setStatusFilter('all');
                  setMonthFilter('todos');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                Data Inicial (Vencimento)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 focus:outline-hidden focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                Data Final (Vencimento)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 focus:outline-hidden focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 focus:outline-hidden focus:border-stone-400"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="paid">Liquidados</option>
              </select>
            </div>

            {availableMonths.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Mês Específico
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 capitalize focus:outline-hidden focus:border-stone-400"
                >
                  <option value="todos">Todos os meses</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-stone-900"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-stone-300" />
            <p className="text-sm font-serif italic text-stone-700 font-bold">Nenhum lançamento encontrado</p>
            <p className="text-xs text-stone-500 mt-1">Ajuste os filtros ou adicione um novo lançamento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <th className="p-3 font-medium">Situação</th>
                  <th className="p-3 font-medium">Vencimento</th>
                  <th className="p-3 font-medium">Descrição / Ciclo</th>
                  <th className="p-3 font-medium text-right">Valor</th>
                  <th className="p-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransactions.map((tx) => {
                  const isOverdue = tx.status === 'pending' && new Date(tx.dueDate) < new Date();
                  
                  return (
                    <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-3">
                        <button
                          onClick={() => toggleStatus(tx)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            tx.status === 'paid' 
                              ? 'bg-stone-100 text-stone-500 hover:bg-stone-200' 
                              : isOverdue 
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200' 
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                          }`}
                          title={tx.status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                        >
                          {tx.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {tx.status === 'paid' ? (tx.type === 'payable' ? 'Pago' : 'Recebido') : isOverdue ? 'Atrasado' : 'Pendente'}
                        </button>
                      </td>
                      <td className="p-3 text-sm font-mono text-stone-600">
                        {new Date(tx.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {tx.status === 'paid' && tx.paymentDate && (
                          <div className="text-xxs text-stone-400 font-sans mt-0.5">
                            Liq: {new Date(tx.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium text-stone-800">{tx.description}</div>
                        {(tx.category || tx.cycleName) && (
                          <div className="flex gap-1.5 mt-1">
                            {tx.category && <span className="text-xxs bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">{tx.category}</span>}
                            {tx.cycleName && <span className="text-xxs bg-stone-900 text-white px-1.5 py-0.5 rounded">{tx.cycleName}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className={`text-sm font-bold font-mono ${tx.type === 'payable' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {tx.type === 'payable' ? '-' : '+'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(tx)}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {tx.status === 'paid' && (
                            <button
                              onClick={() => { setLinkingTx(tx); setLinkCycleId(tx.cycleId ? String(tx.cycleId) : ''); setLinkQuantity(''); setLinkUnit('kg'); }}
                              className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Gerar Custo/Receita (Vincular a Ciclo)"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeletingTx(tx)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      
      {linkSuccessMsg && (
        <div className="fixed top-4 right-4 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">{linkSuccessMsg}</p>
        </div>
      )}

      {linkingTx && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50">
              <h3 className="text-lg font-serif italic font-bold text-stone-800 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                Vincular a Ciclo Produtivo
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Deseja gerar um lançamento de {linkingTx.type === 'payable' ? 'Custo' : 'Receita (Colheita)'} para esta transação?
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Ciclo Produtivo
                </label>
                <select
                  value={linkCycleId}
                  onChange={(e) => setLinkCycleId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#ece3ce] focus:border-[#ece3ce] transition-all outline-none"
                >
                  <option value="">Selecione um ciclo...</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name} ({cycle.plotName})
                    </option>
                  ))}
                </select>
              </div>

              {linkingTx.type === 'receivable' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={linkQuantity}
                      onChange={(e) => setLinkQuantity(e.target.value)}
                      placeholder="Ex: 100"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#ece3ce] focus:border-[#ece3ce] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={linkUnit}
                      onChange={(e) => setLinkUnit(e.target.value)}
                      placeholder="Ex: sacas"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#ece3ce] focus:border-[#ece3ce] transition-all outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={() => setLinkingTx(null)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLink}
                disabled={!linkCycleId || (linkingTx.type === 'receivable' && (!linkQuantity || !linkUnit))}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Gerar {linkingTx.type === 'payable' ? 'Custo' : 'Receita'}
              </button>
            </div>
          </div>
        </div>
      )}

{deletingTx && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Excluir Lançamento</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Deseja realmente remover o lançamento <strong className="font-bold text-stone-900">"{deletingTx.description}"</strong> no valor de <strong className="font-mono">R$ {Number(deletingTx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingTx.id)}
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
