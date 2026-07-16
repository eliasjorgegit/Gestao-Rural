import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { InventoryItem, InventoryMovement, Cycle, INVENTORY_CATEGORIES } from '../types.ts';
import { 
  Package, 
  Plus, 
  Minus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  History, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Layers, 
  AlertCircle
} from 'lucide-react';

interface InventorySectionProps {
  onRefresh?: () => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ onRefresh }) => {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tabs inside Inventory
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [stockStatus, setStockStatus] = useState<'Todos' | 'Baixo' | 'Sem' | 'Normal'>('Todos');

  // Modal State Managers
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);

  // Form states for Item
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemMinQuantity, setItemMinQuantity] = useState('');
  const [itemUnitCost, setItemUnitCost] = useState('');
  const [itemLocation, setItemLocation] = useState('');

  // Form states for Movement
  const [movType, setMovType] = useState<'entrada' | 'saida'>('entrada');
  const [movQuantity, setMovQuantity] = useState('');
  const [movDate, setMovDate] = useState('');
  const [movDescription, setMovDescription] = useState('');
  const [movCycleId, setMovCycleId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resItems, resMovements, resCycles] = await Promise.all([
        fetchWithAuth('/api/inventory'),
        fetchWithAuth('/api/inventory/movements'),
        fetchWithAuth('/api/cycles'),
      ]);

      if (resItems.ok && resMovements.ok && resCycles.ok) {
        setItems(await resItems.json());
        setMovements(await resMovements.json());
        setCycles(await resCycles.json());
      } else {
        setError('Erro ao carregar dados do estoque.');
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

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const openNewItemModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(INVENTORY_CATEGORIES[0]);
    setItemQuantity('0');
    setItemUnit('kg');
    setItemMinQuantity('0');
    setItemUnitCost('0');
    setItemLocation('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemQuantity(item.quantity.toString());
    setItemUnit(item.unit);
    setItemMinQuantity(item.minQuantity.toString());
    setItemUnitCost(item.unitCost.toString());
    setItemLocation(item.location || '');
    setIsItemModalOpen(true);
  };

  const openMovementModal = (item: InventoryItem, defaultType: 'entrada' | 'saida') => {
    setMovementItem(item);
    setMovType(defaultType);
    setMovQuantity('');
    setMovDate(new Date().toISOString().split('T')[0]);
    setMovDescription('');
    setMovCycleId('');
    setIsMovementModalOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!itemName.trim() || !itemCategory || !itemUnit) {
      setError('Nome, categoria e unidade são obrigatórios.');
      return;
    }

    const qty = parseFloat(itemQuantity);
    const minQty = parseFloat(itemMinQuantity);
    const cost = parseFloat(itemUnitCost);

    if (isNaN(qty) || qty < 0 || isNaN(minQty) || minQty < 0 || isNaN(cost) || cost < 0) {
      setError('Quantidade, quantidade mínima e custo unitário devem ser números válidos maiores ou iguais a zero.');
      return;
    }

    try {
      const payload = {
        name: itemName.trim(),
        category: itemCategory,
        quantity: qty,
        unit: itemUnit.trim(),
        minQuantity: minQty,
        unitCost: cost,
        location: itemLocation.trim() || null,
      };

      let res;
      if (editingItem) {
        res = await fetchWithAuth(`/api/inventory/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showSuccess(editingItem ? 'Item atualizado com sucesso!' : 'Item adicionado ao estoque!');
        setIsItemModalOpen(false);
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao salvar item.');
      }
    } catch (err) {
      console.error(err);
      setError('Falha na comunicação com o servidor.');
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!movementItem) return;

    const qty = parseFloat(movQuantity);
    if (isNaN(qty) || qty <= 0) {
      setError('A quantidade de movimentação deve ser maior que zero.');
      return;
    }

    if (movType === 'saida' && movementItem.quantity < qty) {
      setError(`Quantidade insuficiente em estoque. Saldo disponível: ${movementItem.quantity} ${movementItem.unit}`);
      return;
    }

    try {
      const payload = {
        itemId: movementItem.id,
        type: movType,
        quantity: qty,
        date: movDate,
        description: movDescription.trim() || null,
        cycleId: movCycleId ? parseInt(movCycleId) : null,
      };

      const res = await fetchWithAuth('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess(
          movType === 'entrada' 
            ? `Entrada de ${qty} ${movementItem.unit} registrada!` 
            : `Consumo de ${qty} ${movementItem.unit} registrado com sucesso!`
        );
        setIsMovementModalOpen(false);
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao registrar movimentação.');
      }
    } catch (err) {
      console.error(err);
      setError('Falha na comunicação com o servidor.');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Tem certeza de que deseja excluir este item do estoque? Esta ação não pode ser desfeita se houver movimentações vinculadas.')) {
      return;
    }

    try {
      setError(null);
      const res = await fetchWithAuth(`/api/inventory/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('Item excluído com sucesso.');
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao excluir item. Verifique se existem movimentações registradas para ele.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao excluir o item.');
    }
  };

  const handleReverseMovement = async (id: number) => {
    if (!window.confirm('Deseja estornar esta movimentação? O saldo do estoque será atualizado de forma reversa.')) {
      return;
    }

    try {
      setError(null);
      const res = await fetchWithAuth(`/api/inventory/movements/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('Movimentação estornada com sucesso!');
        fetchData();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao estornar movimentação.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao estornar movimentação.');
    }
  };

  // Calculations for overview stats
  const totalStockValue = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
  const lowStockItemsCount = items.filter(item => item.quantity > 0 && item.quantity <= item.minQuantity).length;
  const outOfStockItemsCount = items.filter(item => item.quantity === 0).length;

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    
    let matchesStatus = true;
    if (stockStatus === 'Baixo') {
      matchesStatus = item.quantity > 0 && item.quantity <= item.minQuantity;
    } else if (stockStatus === 'Sem') {
      matchesStatus = item.quantity === 0;
    } else if (stockStatus === 'Normal') {
      matchesStatus = item.quantity > item.minQuantity;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3a4d39]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas de Erro / Sucesso */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-stone-100 rounded-xl text-stone-700">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Itens Cadastrados</p>
            <h4 className="text-2xl font-serif italic font-bold text-stone-900">{items.length}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-medium">Estoque Baixo</p>
            <h4 className="text-2xl font-serif italic font-bold text-amber-900">{lowStockItemsCount}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-700">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-rose-600 font-medium">Sem Estoque</p>
            <h4 className="text-2xl font-serif italic font-bold text-rose-900">{outOfStockItemsCount}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-[#3a4d39]/10 rounded-xl text-[#3a4d39]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#3a4d39] font-medium">Valor Total Estimado</p>
            <h4 className="text-2xl font-serif italic font-bold text-stone-900">
              R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Itens vs Histórico) */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'items' 
              ? 'border-[#3a4d39] text-[#3a4d39]' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Itens em Estoque
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'movements' 
              ? 'border-[#3a4d39] text-[#3a4d39]' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Movimentações
        </button>
      </div>

      {/* TAB CONTENT: ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters & Actions bar */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar produto ou local..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-1 focus:ring-[#3a4d39] focus:border-[#3a4d39] bg-stone-50"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs rounded-xl border border-stone-200 py-2 px-3 bg-stone-50 focus:outline-hidden"
              >
                <option value="Todas">Todas as Categorias</option>
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as any)}
                className="text-xs rounded-xl border border-stone-200 py-2 px-3 bg-stone-50 focus:outline-hidden"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Normal">Estoque Normal</option>
                <option value="Baixo">Estoque Baixo</option>
                <option value="Sem">Sem Estoque</option>
              </select>
            </div>

            <button
              onClick={openNewItemModal}
              className="bg-[#3a4d39] hover:bg-[#4f6b4e] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Novo Produto
            </button>
          </div>

          {/* List/Grid of items */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 text-sm">Nenhum produto encontrado com os filtros aplicados.</p>
              <button
                onClick={openNewItemModal}
                className="mt-4 text-[#3a4d39] hover:underline font-semibold text-xs"
              >
                Cadastrar primeiro produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const isOutOfStock = item.quantity === 0;
                const isLowStock = !isOutOfStock && item.quantity <= item.minQuantity;
                
                return (
                  <div 
                    key={item.id} 
                    className={`bg-white rounded-2xl border p-5 shadow-xs relative transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
                      isOutOfStock ? 'border-red-200 bg-red-50/10' :
                      isLowStock ? 'border-amber-200 bg-amber-50/10' :
                      'border-stone-200'
                    }`}
                  >
                    <div>
                      {/* Category tag & status */}
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {item.category}
                        </span>
                        
                        {isOutOfStock ? (
                          <span className="bg-red-100 text-red-800 text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1">
                            Sem Estoque
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Estoque Baixo
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-lg">
                            Disponível
                          </span>
                        )}
                      </div>

                      {/* Item Details */}
                      <h5 className="font-serif italic font-bold text-stone-900 text-lg mb-1 leading-tight">{item.name}</h5>
                      
                      {item.location && (
                        <p className="text-stone-500 text-xs flex items-center gap-1 mb-3">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          {item.location}
                        </p>
                      )}

                      {/* Stock metrics */}
                      <div className="grid grid-cols-2 gap-2 border-t border-b border-stone-100 py-3 my-3 text-stone-600">
                        <div>
                          <p className="text-[10px] text-stone-400 font-medium">QUANTIDADE ATUAL</p>
                          <p className="text-base font-bold text-stone-900">
                            {item.quantity} <span className="text-xs text-stone-500 font-normal">{item.unit}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-400 font-medium">VALOR EM ESTOQUE</p>
                          <p className="text-base font-bold text-stone-800">
                            R$ {(item.quantity * item.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Technical specifications */}
                      <div className="flex justify-between text-[11px] text-stone-500 mb-4">
                        <span>Custo unitário: <b>R$ {item.unitCost.toFixed(2)}</b></span>
                        <span>Mínimo: <b>{item.minQuantity} {item.unit}</b></span>
                      </div>
                    </div>

                    {/* Stock action buttons */}
                    <div className="flex gap-2 justify-between items-center pt-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openMovementModal(item, 'entrada')}
                          title="Registrar Entrada"
                          className="bg-[#3a4d39]/10 hover:bg-[#3a4d39]/20 text-[#3a4d39] text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Entrada
                        </button>
                        <button
                          onClick={() => openMovementModal(item, 'saida')}
                          title="Registrar Consumo/Saída"
                          disabled={item.quantity === 0}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          Saída / Uso
                        </button>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-all cursor-pointer"
                          title="Editar cadastro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-all cursor-pointer"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB CONTENT: MOVEMENTS HISTORY */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h4 className="font-serif italic font-bold text-stone-900 text-lg">Histórico de Entradas e Saídas</h4>
            <span className="text-xs text-stone-500 font-mono">{movements.length} registro(s)</span>
          </div>

          {movements.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 text-sm">Nenhuma movimentação de estoque registrada até o momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Quantidade</th>
                    <th className="py-3 px-4">Destino/Vínculo</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {movements.map(mov => (
                    <tr key={mov.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 text-stone-600 font-mono">
                        {mov.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {mov.itemName}
                      </td>
                      <td className="py-3 px-4">
                        {mov.type === 'entrada' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-semibold">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Saída / Consumo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-stone-900">
                        {mov.quantity} <span className="text-stone-500 font-normal">{mov.itemUnit}</span>
                      </td>
                      <td className="py-3 px-4">
                        {mov.cycleName ? (
                          <span className="text-stone-800 bg-[#3a4d39]/10 px-2 py-0.5 rounded-lg font-medium text-[11px] block truncate max-w-[150px]" title={mov.cycleName}>
                            Ciclo: {mov.cycleName}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 italic max-w-xs truncate" title={mov.description || ''}>
                        {mov.description || 'Nenhuma descrição'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleReverseMovement(mov.id)}
                          className="text-stone-400 hover:text-rose-600 text-[11px] font-semibold px-2 py-1 rounded-md hover:bg-rose-50 transition-all cursor-pointer"
                          title="Estornar esta movimentação de estoque"
                        >
                          Estornar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NEW / EDIT ITEM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-serif italic font-bold text-xl text-stone-900">
                {editingItem ? 'Editar Produto de Estoque' : 'Cadastrar Novo Produto'}
              </h3>
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">NOME DO PRODUTO *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Adubo NPK 04-14-08, Calcário, Enxada, Saco de Milho..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden focus:ring-1 focus:ring-[#3a4d39]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">CATEGORIA DO ITEM *</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                  >
                    {INVENTORY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">UNIDADE DE MEDIDA *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: kg, litros, sacos, unidades, m"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">
                    {editingItem ? 'SALDO EM ESTOQUE *' : 'SALDO INICIAL *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                  />
                  {editingItem && (
                    <span className="text-[10px] text-[#3a4d39] mt-1 block">Ajuste o saldo diretamente caso queira corrigir um lançamento incorreto.</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">QUANTIDADE MÍNIMA (ALERTA)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={itemMinQuantity}
                    onChange={(e) => setItemMinQuantity(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">CUSTO UNITÁRIO (R$) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={itemUnitCost}
                    onChange={(e) => setItemUnitCost(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">LOCAL DE ARMAZENAMENTO</label>
                  <input
                    type="text"
                    placeholder="Ex: Galpão A, Depósito Principal..."
                    value={itemLocation}
                    onChange={(e) => setItemLocation(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#3a4d39] hover:bg-[#4f6b4e] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER STOCK MOVEMENT */}
      {isMovementModalOpen && movementItem && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-serif italic font-bold text-xl text-stone-900">
                  {movType === 'entrada' ? 'Registrar Entrada' : 'Registrar Consumo / Saída'}
                </h3>
                <p className="text-xs text-stone-500 font-medium">Produto: <span className="font-semibold text-stone-800">{movementItem.name}</span></p>
              </div>
              <button 
                onClick={() => setIsMovementModalOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">
                  QUANTIDADE ({movementItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`Insira a quantidade em ${movementItem.unit}`}
                  value={movQuantity}
                  onChange={(e) => setMovQuantity(e.target.value)}
                  className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden focus:ring-1 focus:ring-[#3a4d39]"
                />
                {movType === 'saida' && (
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    Saldo disponível em estoque: <b>{movementItem.quantity} {movementItem.unit}</b>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">DATA DA MOVIMENTAÇÃO *</label>
                <input
                  type="date"
                  required
                  value={movDate}
                  onChange={(e) => setMovDate(e.target.value)}
                  className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                />
              </div>

              {/* Conditionally link Saída to a Cycle for cost tracking */}
              {movType === 'saida' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">VINCULAR A UM CICLO PRODUTIVO (OPCIONAL)</label>
                  <select
                    value={movCycleId}
                    onChange={(e) => setMovCycleId(e.target.value)}
                    className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden bg-white text-stone-800"
                  >
                    <option value="">Nenhum ciclo produtivo</option>
                    {cycles.filter(c => c.status === 'Ativo').map(cycle => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.name} (Talhão: {cycle.plotName})
                      </option>
                    ))}
                  </select>
                  {movCycleId && (
                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mt-2 text-[11px] text-stone-600 space-y-1">
                      <p className="font-semibold text-[#3a4d39] flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Integração Financeira Ativa:
                      </p>
                      <p>
                        Esta saída de estoque criará automaticamente um registro correspondente de custo no ciclo selecionado.
                      </p>
                      <p className="font-mono">
                        Custo Estimado: R$ {(parseFloat(movQuantity || '0') * movementItem.unitCost).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1.5">DESCRITIVO / OBSERVAÇÕES</label>
                <textarea
                  placeholder="Ex: Compra de insumo Safra 2026, Consumo preventivo contra pragas, etc."
                  value={movDescription}
                  onChange={(e) => setMovDescription(e.target.value)}
                  rows={3}
                  className="w-full text-sm rounded-xl border border-stone-200 py-2.5 px-4 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#3a4d39] hover:bg-[#4f6b4e] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Registrar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
