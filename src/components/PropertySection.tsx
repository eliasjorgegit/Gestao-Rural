import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Property } from '../types.ts';
import { Landmark, MapPin, Minimize2, Edit3, Save, CheckCircle } from 'lucide-react';

interface PropertySectionProps {
  onPropertyChange?: () => void;
}

export const PropertySection: React.FC<PropertySectionProps> = ({ onPropertyChange }) => {
  const { fetchWithAuth } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [totalArea, setTotalArea] = useState('');

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/property');
      if (res.ok) {
        const data = await res.json();
        setProperty(data);
        if (data) {
          setName(data.name);
          setLocation(data.location);
          setTotalArea(data.totalArea.toString());
        }
      } else {
        setError('Falha ao carregar propriedade.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de rede.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !location.trim() || !totalArea.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const areaNum = parseFloat(String(totalArea).replace(",", "."));
    if (isNaN(areaNum) || areaNum <= 0) {
      setError('Área Total deve ser um número maior que zero.');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/property', {
        method: 'POST',
        body: JSON.stringify({ name, location, totalArea: areaNum }),
      });

      if (res.ok) {
        const data = await res.json();
        setProperty(data);
        setIsEditing(false);
        setSuccess('Propriedade salva com sucesso!');
        if (onPropertyChange) onPropertyChange();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao salvar propriedade.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar propriedade.');
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
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-[#3a4d39] text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Landmark className="w-6 h-6 text-amber-200" />
          <div>
            <h2 className="font-serif italic font-bold text-lg tracking-tight">Propriedade Rural</h2>
            <p className="text-xs text-stone-300">Dados cadastrais únicos da sua fazenda/sítio</p>
          </div>
        </div>
        {property && !isEditing && (
          <button
            id="edit-property-btn"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-white font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Editar
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-[#ece3ce]/40 text-stone-850 text-sm rounded-xl border border-[#d2c49a] flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-[#3a4d39]" />
            {success}
          </div>
        )}

        {isEditing || !property ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Nome da Propriedade
                </label>
                <input
                  id="prop-name-input"
                  type="text"
                  placeholder="Ex: Fazenda Bela Vista"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-stone-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Localização / Município
                </label>
                <input
                  id="prop-location-input"
                  type="text"
                  placeholder="Ex: Guaxupé - MG"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-stone-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Área Total (Hectares)
                </label>
                <input
                  id="prop-area-input"
                  type="number"
                  step="any"
                  placeholder="Ex: 120.5"
                  value={totalArea}
                  onChange={(e) => setTotalArea(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#3a4d39] text-sm font-sans transition-all bg-stone-50"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {property && (
                <button
                  id="cancel-property-btn"
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(property.name);
                    setLocation(property.location);
                    setTotalArea(property.totalArea.toString());
                  }}
                  className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-medium"
                >
                  Cancelar
                </button>
              )}
              <button
                id="save-property-btn"
                type="submit"
                className="flex items-center gap-1.5 bg-[#3a4d39] hover:bg-[#4f6b4e] text-white px-5 py-2 text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Cadastro
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-stone-50 border border-stone-100">
              <div className="p-3 rounded-lg bg-[#ece3ce] text-[#3a4d39]">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Fazenda / Sítio</p>
                <p className="font-serif italic font-bold text-stone-800 text-lg leading-tight">{property.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-stone-50 border border-stone-100">
              <div className="p-3 rounded-lg bg-[#ece3ce] text-[#3a4d39]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Localização</p>
                <p className="font-semibold text-stone-700 text-base font-sans">{property.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-stone-50 border border-stone-100">
              <div className="p-3 rounded-lg bg-[#ece3ce] text-[#3a4d39]">
                <Minimize2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Área Total</p>
                <p className="font-semibold text-stone-800 text-base font-mono">{property.totalArea} ha</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
