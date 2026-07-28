export interface Property {
  id: number;
  userId: number;
  name: string;
  location: string;
  totalArea: number; // Hectares
  createdAt?: string;
}

export interface Activity {
  id: number;
  userId: number;
  name: string;
  createdAt?: string;
}

export interface Plot {
  id: number;
  userId: number;
  name: string;
  size: number; // Hectares
  soilType: string;
  plantCount?: number; // Número de Plantas / Pés
  variety?: string; // Variedade / Espécie
  createdAt?: string;
}

export interface Cycle {
  id: number;
  userId: number;
  plotId: number;
  activityId: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: string; // 'Ativo' | 'Concluído'
  createdAt?: string;
  
  // Joins
  plotName?: string;
  plotSize?: number;
  plotPlantCount?: number;
  plotVariety?: string;
  activityName?: string;
}

export interface Cost {
  id: number;
  userId: number;
  cycleId: number;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  value: number; // R$
  paymentMethod?: string;
  payer?: string;
  inventoryMovementId?: number;
  transactionId?: number;
  createdAt?: string;
  
  // Joins
  cycleName?: string;
  plotName?: string;
}

export interface Harvest {
  id: number;
  userId: number;
  cycleId: number;
  date: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  pricePerUnit: number; // R$
  transactionId?: number;
  createdAt?: string;
  
  // Joins
  cycleName?: string;
  plotName?: string;
}

export const COST_CATEGORIES = [
  "Adubação",
  "Manutenção",
  "Mão de obra",
  "Plantio",
  "Irrigação",
  "Pulverização",
  "Agrotóxicos",
  "Sementes / Mudas",
  "Combustível / Transporte",
  "Outros"
];

export const HARVEST_UNITS = [
  "sacas",
  "kg",
  "toneladas",
  "arrobas",
  "litros",
  "unidades"
];

export interface InventoryItem {
  id: number;
  userId: number;
  name: string;
  category: string; // 'Adubos', 'Defensivos Agrícolas', 'Ferramentas', 'Mantimentos', 'Outros'
  quantity: number;
  unit: string;
  minQuantity: number;
  unitCost: number;
  location?: string;
  createdAt?: string;
}

export interface InventoryMovement {
  id: number;
  userId: number;
  itemId: number;
  type: 'entrada' | 'saida';
  quantity: number;
  date: string; // YYYY-MM-DD
  description?: string;
  cycleId?: number;
  createdAt?: string;
  
  // Joins
  itemName?: string;
  itemUnit?: string;
  cycleName?: string;
}

export const INVENTORY_CATEGORIES = [
  "Adubos",
  "Defensivos Agrícolas",
  "Ferramentas",
  "Mantimentos",
  "Sementes / Mudas",
  "Outros"
];

export interface Transaction {
  id: number;
  userId: number;
  type: 'payable' | 'receivable';
  description: string;
  amount: number; // R$
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string | null; // YYYY-MM-DD
  status: 'pending' | 'paid';
  category?: string;
  cycleId?: number;
  createdAt?: string;

  // Joins
  cycleName?: string;
}

export interface Schedule {
  id: number;
  userId: number;
  title: string;
  type: string; // 'Adubação', 'Pulverização / Defensivo', 'Irrigação', 'Poda / Roçagem', 'Análise de Solo', 'Outro'
  scheduledDate: string; // YYYY-MM-DD
  status: 'Pendente' | 'Concluído' | 'Cancelado';
  priority: 'Baixa' | 'Média' | 'Alta';
  description?: string;
  cycleId?: number | null;
  plotId?: number | null;
  completedDate?: string | null;
  costValue?: number | null;
  createdAt?: string;

  // Joins
  cycleName?: string;
  plotName?: string;
}

export const SCHEDULE_TYPES = [
  "Adubação",
  "Pulverização / Defensivo",
  "Irrigação",
  "Poda / Roçagem",
  "Análise de Solo",
  "Colheita / Preparo",
  "Outro"
];

