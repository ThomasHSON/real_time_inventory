export interface ReplenishmentItem {
  code: string;
  material_no: string;
  name: string;
  type: string;
  currentStock: number;
  avgDailyConsumption: number;
  safetyQuantity: number;
  standardQuantity: number;
  medGuid?: string;
  fileStatus?: string;
}
