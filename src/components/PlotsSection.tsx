import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Plot } from '../types.ts';
import { LayoutGrid, Plus, Edit2, Trash2, Save, X, AlertTriangle, Sprout } from 'lucide-react';

interface PlotsSectionProps {
  onRefresh?: () => void;
}

export const PlotsSection: React.FC<PlotsSectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [deletingPlot, setDeletingPlot] = useState<Plot | null>(null);

  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [soilType, setSoilType] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [variety, setVariety] = useState('');

  const fetchPlots = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/plots');
      if (res.ok) {
        setPlots(await res.json());
      } else {
        setError('Erro ao carregar talhões.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
  }, []);

  const resetForm = () => {
    setName('');
    setSize('');
    setSoilType('');
    setPlantCount('');
    setVariety('');
    setIsAdding(false);
    setEditingPlot(null);
  };

  const handleEditClick = (plot: Plot) => {
    setEditingPlot(plot);
    setName(plot.name);
    setSize(plot.size.toString());
    setSoilType(plot.soilType);
    setPlantCount(plot.plantCount !== undefined && plot.plantCount !== null ? plot.plantCount.toString() : '');
    setVariety(plot.variety || '');
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !size.trim() || !soilType.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const sizeNum = parseFloat(String(size).replace(",", "."));
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setError('O tamanho do talhão deve ser um número maior que zero.');
      return;
    }

    const countNum = plantCount.trim() !== '' ? parseInt(plantCount, 10) : 0;
    if (plantCount.trim() !== '' && (isNaN(countNum) || countNum < 0)) {
      setError('O número de plantas deve ser um número inteiro válido (≥ 0).');
      return;
    }

    const payload = {
      name: name.trim(),
      size: sizeNum,
      soilType: soilType.trim(),
      plantCount: countNum,
      variety: variety.trim(),
    };

    try {
      if (editingPlot) {
        // Edit
        const res = await fetchWithAuth(`/api/plots/${editingPlot.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const updated = await res.json();
          setPlots(plots.map(p => p.id === editingPlot.id ? updated : p));
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao editar talhão.');
        }
      } else {
        // Add
        const res = await fetchWithAuth('/api/plots', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const added = await res.json();
          setPlots([added, ...plots]);
          resetForm();
          if (onRefresh) onRefresh();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Erro ao adicionar talhão.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede ao conectar.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/plots/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlots(plots.filter(p => p.id !== id));
        setDeletingPlot(null);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao remover talhão.');
        setDeletingPlot(null);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o servidor.');
      setDeletingPlot(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-[#3a4d39] text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-amber-200" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Talhões / Áreas</h2>
            <p className="text-xs text-stone-300">Divisões de terra disponíveis na propriedade</p>
          </div>
        </div>
        {!isAdding && !editingPlot && (
          <button
            id="add-plot-btn-trigger"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Talhão
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

        {(isAdding || editingPlot) && (
          <form onSubmit={handleSubmit} className="mb-6 p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
            <h3 className="font-serif italic font-bold text-stone-850 text-base">
              {editingPlot ? 'Editar Talhão' : 'Cadastrar Novo Talhão'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Identificação do Talhão *
                </label>
                <input
                  id="plot-name-input"
                  type="text"
                  placeholder="Ex: Talhão 01, Área Norte"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Tamanho (Hectares) *
                </label>
                <input
                  id="plot-size-input"
                  type="number"
                  step="any"
                  placeholder="Ex: 25.4"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Tipo de Solo / Relevo *
                </label>
                <input
                  id="plot-soil-input"
                  type="text"
                  placeholder="Ex: Argiloso / Plano"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Qtd. de Plantas / Pés
                </label>
                <input
                  id="plot-plants-input"
                  type="number"
                  placeholder="Ex: 2500"
                  value={plantCount}
                  onChange={(e) => setPlantCount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Variedade / Espécie
                </label>
                <input
                  id="plot-variety-input"
                  type="text"
                  placeholder="Ex: Café Catuaí Vermelho, Bourbon, Conilon"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                id="cancel-plot-form"
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                id="submit-plot-form"
                type="submit"
                className="flex items-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-5 py-2 text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Talhão
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3a4d39]"></div>
          </div>
        ) : plots.length === 0 ? (
          <div className="text-center py-10 text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
            <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-stone-300" />
            <p className="text-sm font-sans">Nenhum talhão cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plots.map((plot) => (
              <div 
                key={plot.id} 
                className="p-5 border border-stone-200 rounded-2xl bg-stone-50/50 hover:bg-white hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-serif italic font-bold text-stone-800 text-lg leading-tight">{plot.name}</h4>
                      {plot.variety && (
                        <p className="text-xs text-[#3a4d39] font-medium mt-0.5 flex items-center gap-1">
                          <Sprout className="w-3.5 h-3.5 text-emerald-600 inline" />
                          {plot.variety}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-[#ece3ce] text-[#3a4d39] font-mono text-xs font-semibold px-2.5 py-1 rounded-full border border-[#d2c49a]/30">
                        {plot.size} ha
                      </span>
                      {plot.plantCount !== undefined && plot.plantCount > 0 && (
                        <span className="bg-emerald-50 text-emerald-800 font-mono text-[11px] font-medium px-2 py-0.5 rounded-md border border-emerald-200">
                          {plot.plantCount.toLocaleString('pt-BR')} plantas
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Solo / Relevo</p>
                    <p className="text-sm font-medium text-stone-700">{plot.soilType}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-stone-100">
                  <button
                    id={`edit-plot-btn-${plot.id}`}
                    onClick={() => handleEditClick(plot)}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-[#3a4d39] px-2.5 py-1 hover:bg-[#ece3ce]/60 rounded-lg transition-all cursor-pointer font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    id={`delete-plot-btn-${plot.id}`}
                    onClick={() => setDeletingPlot(plot)}
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
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE TALHÃO */}
      {deletingPlot && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Excluir Talhão</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Deseja realmente remover o talhão <strong className="font-bold text-stone-900">"{deletingPlot.name}"</strong>?
            </p>
            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200/80">
              <b>Atenção:</b> Esta ação apagará todos os ciclos produtivos, custos e colheitas associados a este talhão!
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-delete-plot-btn"
                onClick={() => setDeletingPlot(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-plot-btn"
                onClick={() => handleDelete(deletingPlot.id)}
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
