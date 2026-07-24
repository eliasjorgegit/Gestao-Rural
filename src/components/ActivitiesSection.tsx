import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Activity } from '../types.ts';
import { Sprout, Edit2, Trash2, Plus, Check, X, AlertTriangle } from 'lucide-react';

interface ActivitiesSectionProps {
  onRefresh?: () => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create / Edit states
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/activities');
      if (res.ok) {
        setActivities(await res.json());
      } else {
        setError('Erro ao carregar catálogo de atividades.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao buscar atividades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await fetchWithAuth('/api/activities', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        setActivities([added, ...activities]);
        setNewName('');
        setError(null);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao adicionar atividade.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o servidor.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editingName.trim()) return;

    try {
      const res = await fetchWithAuth(`/api/activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActivities(activities.map(act => act.id === id ? updated : act));
        setEditingId(null);
        setEditingName('');
        setError(null);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao editar atividade.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o servidor.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/activities/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setActivities(activities.filter(act => act.id !== id));
        setError(null);
        setDeletingActivity(null);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao remover atividade.');
        setDeletingActivity(null);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o servidor.');
      setDeletingActivity(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-[#3a4d39] text-white flex items-center gap-3">
        <Sprout className="w-6 h-6 text-amber-200" />
        <div>
          <h2 className="font-serif italic font-bold text-lg tracking-tight">Catálogo de Atividades</h2>
          <p className="text-xs text-stone-300">Gerencie as culturas agrícolas e categorias de pecuária</p>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Adicionar Nova Atividade */}
        <form onSubmit={handleAdd} className="mb-6 flex gap-2">
          <input
            id="activity-name-input"
            type="text"
            placeholder="Nova atividade... ex: Café, Soja, Gado de Corte"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-stone-50"
            required
          />
          <button
            id="add-activity-btn"
            type="submit"
            className="flex items-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-5 py-2.5 text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3a4d39]"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-stone-400 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
            <Sprout className="w-8 h-8 mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-sans">Nenhuma atividade cadastrada no catálogo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activities.map((act) => (
              <div 
                key={act.id} 
                className="flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-xl transition-all hover:shadow-xs"
              >
                {editingId === act.id ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      id={`edit-activity-input-${act.id}`}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-sm bg-white border border-[#3a4d39] rounded-lg focus:outline-hidden font-sans"
                    />
                    <button
                      id={`save-edit-activity-${act.id}`}
                      onClick={() => handleUpdate(act.id)}
                      className="p-1.5 text-[#3a4d39] hover:bg-[#ece3ce] rounded-md transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      id={`cancel-edit-activity-${act.id}`}
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#739072]"></div>
                      <span className="font-semibold text-stone-800 text-sm font-sans">{act.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        id={`edit-activity-btn-${act.id}`}
                        onClick={() => {
                          setEditingId(act.id);
                          setEditingName(act.name);
                        }}
                        className="p-1.5 text-stone-400 hover:text-stone-750 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-activity-btn-${act.id}`}
                        onClick={() => setDeletingActivity(act)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE ATIVIDADE */}
      {deletingActivity && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">Excluir Atividade</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Deseja realmente remover a atividade <strong className="font-bold text-stone-900">"{deletingActivity.name}"</strong>?
            </p>
            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200/80">
              <b>Atenção:</b> Esta ação apagará todos os ciclos produtivos, custos e colheitas vinculados a esta cultura!
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-delete-activity-btn"
                onClick={() => setDeletingActivity(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-activity-btn"
                onClick={() => handleDelete(deletingActivity.id)}
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
