import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Cost, Cycle, COST_CATEGORIES } from '../types.ts';
import { DollarSign, Plus, Edit2, Trash2, Save, X, AlertTriangle } from 'lucide-react';

interface CostsSectionProps {
  onRefresh?: () => void;
}

export const CostsSection: React.FC<CostsSectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [deletingCost, setDeletingCost] = useState<Cost | null>(null);

  const [cycleId, setCycleId] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payer, setPayer] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCosts, resCycles] = await Promise.all([
        fetchWithAuth('/api/costs'),
        fetchWithAuth('/api/cycles'),
      ]);

      if (resCosts.ok && resCycles.ok) {
        setCosts(await resCosts.ok ? await resCosts.json() : []);
        setCycles(await resCycles.ok ? await resCycles.json() : []);
      } else {
        setError('Erro ao carregar lançamentos de custos.');
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
    setCycleId('');
    setDate('');
    setCategory('');
    setDescription('');
    setValue('');
    setPaymentMethod('');
    setPayer('');
    setIsAdding(false);
    setEditingCost(null);
  };

  const handleEditClick = (cost: Cost) => {
    setEditingCost(cost);
    setCycleId(cost.cycleId.toString());
    setDate(cost.date);
    setCategory(cost.category);
    setDescription(cost.description);
    setValue(cost.value.toString());
    setPaymentMethod(cost.paymentMethod || '');
    setPayer(cost.payer || '');
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cycleId || !date || !category || !description.trim() || !value.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const costValue = parseFloat(String(value).replace(",", "."));
    if (isNaN(costValue) || costValue <= 0) {
      setError('O valor do custo deve ser um número maior que zero.');
      return;
    }

    try {
      const payload = {
        cycleId: parseInt(cycleId),
        date,
        category,
        description: description.trim(),
        value: costValue,
        paymentMethod: paymentMethod || undefined,
        payer: payer.trim() || undefined,
      };

      if (editingCost) {
        // Edit
        const res = await fetchWithAuth(`/api/costs/${editingCost.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao editar lançamento.');
        }
      } else {
        // Add
        const res = await fetchWithAuth('/api/costs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao registrar custo.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      const res = await fetchWithAuth(`/api/costs/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeletingCost(null);
        await fetchData();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao remover lançamento.');
        setDeletingCost(null);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar.');
      setDeletingCost(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-[#3a4d39] text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-amber-200" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Lançamento de Custos</h2>
            <p className="text-xs text-stone-300">Registre os insumos, adubações, manutenções e mão de obra</p>
          </div>
        </div>
        {!isAdding && !editingCost && cycles.length > 0 && (
          <button
            id="add-cost-btn-trigger"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            Lançar Custo
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

        {cycles.length === 0 ? (
          <div className="text-center py-8 bg-[#ece3ce]/25 border border-[#d2c49a]/60 rounded-2xl p-6">
            <AlertTriangle className="w-8 h-8 text-stone-500 mx-auto mb-2" />
            <p className="text-sm font-serif italic font-bold text-stone-850">Ciclos produtivos ausentes</p>
            <p className="text-xs text-stone-600 mt-1">
              Cadastre pelo menos um **Ciclo Produtivo** ativo antes de lançar custos.
            </p>
          </div>
        ) : (
          <>
            {(isAdding || editingCost) && (
              <form onSubmit={handleSubmit} className="mb-6 p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                <h3 className="font-serif italic font-bold text-stone-850 text-base">
                  {editingCost ? 'Editar Lançamento de Custo' : 'Lançar Novo Custo'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Vincular ao Ciclo Produtivo
                    </label>
                    <select
                      id="cost-cycle-select"
                      value={cycleId}
                      onChange={(e) => setCycleId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    >
                      <option value="">-- Escolher Ciclo --</option>
                      {cycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.plotName} - {c.activityName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Data do Custo
                    </label>
                    <input
                      id="cost-date-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Categoria do Custo
                    </label>
                    <select
                      id="cost-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    >
                      <option value="">-- Escolher Categoria --</option>
                      {COST_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Descrição do Insumo / Serviço
                    </label>
                    <input
                      id="cost-desc-input"
                      type="text"
                      placeholder="Ex: Compra de 50 sacos de fertilizante NPK"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Valor (R$)
                    </label>
                    <input
                      id="cost-value-input"
                      type="number"
                      step="any"
                      placeholder="Ex: 1500.00"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Forma de Pagamento
                    </label>
                    <select
                      id="cost-payment-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                    >
                      <option value="">-- Opcional --</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Pix">Pix</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Transferência">Transferência Bancária</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Pagador
                    </label>
                    <input
                      id="cost-payer-input"
                      type="text"
                      placeholder="Quem efetuou o pagamento"
                      value={payer}
                      onChange={(e) => setPayer(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    id="cancel-cost-form"
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-cost-form"
                    type="submit"
                    className="flex items-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-5 py-2 text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Custo
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3a4d39]"></div>
              </div>
            ) : costs.length === 0 ? (
              <div className="text-center py-10 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-sans">Nenhum custo lançado ainda.</p>
                <p className="text-xs text-stone-400 mt-1">Crie um lançamento clicando em "Lançar Custo" acima.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-xxs">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Ciclo / Talhão</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Pagamento</th>
                      <th className="py-3 px-4 text-right">Valor (R$)</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {costs.map((cost) => (
                      <tr key={cost.id} className="hover:bg-[#ece3ce]/10 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                          {new Date(cost.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-serif italic font-bold text-stone-800 text-sm leading-tight block">{cost.cycleName}</span>
                            <span className="text-xs text-stone-400 font-medium block">Talhão: {cost.plotName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block bg-[#ece3ce]/70 text-[#3a4d39] border border-[#d2c49a]/30 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {cost.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">{cost.description}</td>
                        <td className="py-3.5 px-4">
                          {cost.paymentMethod && <span className="block text-xs text-stone-600">{cost.paymentMethod}</span>}
                          {cost.payer && <span className="block text-xs text-stone-400 font-medium">{cost.payer}</span>}
                          {!cost.paymentMethod && !cost.payer && <span className="text-xs text-stone-300">-</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                          {cost.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              id={`edit-cost-btn-${cost.id}`}
                              onClick={() => handleEditClick(cost)}
                              className="p-1.5 text-stone-400 hover:text-[#3a4d39] hover:bg-[#ece3ce]/60 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-cost-btn-${cost.id}`}
                              onClick={() => setDeletingCost(cost)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CUSTO */}
      {deletingCost && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Excluir Lançamento de Custo</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Deseja realmente remover o custo de <strong className="font-mono text-stone-900">{deletingCost.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> ("{deletingCost.description}")?
            </p>
            <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200/80">
              <b>Devolução de Estoque:</b> Se este lançamento tiver origem no consumo de insumos do estoque, a quantidade utilizada será automaticamente estornada e devolvida para o seu Estoque de Insumos!
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-delete-cost-btn"
                onClick={() => setDeletingCost(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-cost-btn"
                onClick={() => handleDelete(deletingCost.id)}
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
