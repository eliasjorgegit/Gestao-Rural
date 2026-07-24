import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Harvest, Cycle, HARVEST_UNITS } from '../types.ts';
import { ShoppingBag, Plus, Edit2, Trash2, Save, X, AlertTriangle } from 'lucide-react';

interface HarvestsSectionProps {
  onRefresh?: () => void;
}

export const HarvestsSection: React.FC<HarvestsSectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);
  const [deletingHarvest, setDeletingHarvest] = useState<Harvest | null>(null);

  const [cycleId, setCycleId] = useState('');
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resHarvests, resCycles] = await Promise.all([
        fetchWithAuth('/api/harvests'),
        fetchWithAuth('/api/cycles'),
      ]);

      if (resHarvests.ok && resCycles.ok) {
        setHarvests(await resHarvests.ok ? await resHarvests.json() : []);
        setCycles(await resCycles.ok ? await resCycles.json() : []);
      } else {
        setError('Erro ao carregar registros de colheita/produção.');
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
    setQuantity('');
    setUnit('');
    setPricePerUnit('');
    setIsAdding(false);
    setEditingHarvest(null);
  };

  const handleEditClick = (harvest: Harvest) => {
    setEditingHarvest(harvest);
    setCycleId(harvest.cycleId.toString());
    setDate(harvest.date);
    setQuantity(harvest.quantity.toString());
    setUnit(harvest.unit);
    setPricePerUnit(harvest.pricePerUnit.toString());
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cycleId || !date || !quantity.trim() || !unit || !pricePerUnit.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(pricePerUnit);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('A quantidade deve ser um número maior que zero.');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('O preço unitário deve ser um número maior que zero.');
      return;
    }

    try {
      const payload = {
        cycleId: parseInt(cycleId),
        date,
        quantity: qtyNum,
        unit,
        pricePerUnit: priceNum,
      };

      if (editingHarvest) {
        // Edit
        const res = await fetchWithAuth(`/api/harvests/${editingHarvest.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao editar colheita.');
        }
      } else {
        // Add
        const res = await fetchWithAuth('/api/harvests', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await fetchData();
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao registrar colheita.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/harvests/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setHarvests(harvests.filter(h => h.id !== id));
        setDeletingHarvest(null);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao remover colheita.');
        setDeletingHarvest(null);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar.');
      setDeletingHarvest(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-[#3a4d39] text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-amber-200" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Registro de Produção / Colheita</h2>
            <p className="text-xs text-stone-300">Registre os volumes colhidos, as vendas e preços médios praticados</p>
          </div>
        </div>
        {!isAdding && !editingHarvest && cycles.length > 0 && (
          <button
            id="add-harvest-btn-trigger"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            Lançar Colheita
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
              Cadastre pelo menos um **Ciclo Produtivo** ativo antes de lançar colheitas/produções.
            </p>
          </div>
        ) : (
          <>
            {(isAdding || editingHarvest) && (
              <form onSubmit={handleSubmit} className="mb-6 p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                <h3 className="font-serif italic font-bold text-stone-850 text-base">
                  {editingHarvest ? 'Editar Registro de Colheita' : 'Registrar Nova Colheita / Produção'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Ciclo Produtivo de Origem
                    </label>
                    <select
                      id="harvest-cycle-select"
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
                      Data da Colheita / Venda
                    </label>
                    <input
                      id="harvest-date-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Unidade de Medida
                    </label>
                    <select
                      id="harvest-unit-select"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    >
                      <option value="">-- Escolher Unidade --</option>
                      {HARVEST_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Quantidade Produzida
                    </label>
                    <input
                      id="harvest-quantity-input"
                      type="number"
                      step="any"
                      placeholder="Ex: 150"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      Preço Unitário de Venda (R$)
                    </label>
                    <input
                      id="harvest-price-input"
                      type="number"
                      step="any"
                      placeholder="Ex: 820.00"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    id="cancel-harvest-form"
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-harvest-form"
                    type="submit"
                    className="flex items-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-5 py-2 text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Registro
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3a4d39]"></div>
              </div>
            ) : harvests.length === 0 ? (
              <div className="text-center py-10 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-sans">Nenhuma colheita registrada ainda.</p>
                <p className="text-xs text-stone-400 mt-1">Crie um registro clicando em "Lançar Colheita" acima.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-xxs">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Ciclo / Talhão</th>
                      <th className="py-3 px-4">Produção / Unidade</th>
                      <th className="py-3 px-4 text-right">Preço de Venda (R$)</th>
                      <th className="py-3 px-4 text-right">Receita Total Estimada</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {harvests.map((h) => (
                      <tr key={h.id} className="hover:bg-[#ece3ce]/10 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                          {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-serif italic font-bold text-stone-800 text-sm leading-tight block">{h.cycleName}</span>
                            <span className="text-xs text-stone-400 font-medium block">Talhão: {h.plotName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-800">
                          {h.quantity} <span className="text-stone-400 text-xs font-normal">{h.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                          {h.pricePerUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {h.unit.replace(/s$/, '')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#3a4d39]">
                          {(h.quantity * h.pricePerUnit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              id={`edit-harvest-btn-${h.id}`}
                              onClick={() => handleEditClick(h)}
                              className="p-1.5 text-stone-400 hover:text-[#3a4d39] hover:bg-[#ece3ce]/60 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-harvest-btn-${h.id}`}
                              onClick={() => setDeletingHarvest(h)}
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

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE COLHEITA */}
      {deletingHarvest && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Excluir Registro</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Deseja realmente remover este registro de colheita/venda do ciclo <strong className="font-bold text-stone-900">"{deletingHarvest.cycleName}"</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-delete-harvest-btn"
                onClick={() => setDeletingHarvest(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-harvest-btn"
                onClick={() => handleDelete(deletingHarvest.id)}
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
