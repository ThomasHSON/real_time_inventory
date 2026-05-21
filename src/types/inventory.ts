export interface MedCloud {
  BARCODE: string[];
  GUID: string;
  CODE: string;
  SKDIACODE: string;
  ATC: string;
  CHT_NAME: string;
  NAME: string;
  DIANAME: string;
  TRADENAME: string;
  GROUP: string;
  HI_CODE: string;
  PAKAGE: string;
  PAKAGE_VAL: string;
  MIN_PAKAGE: string;
  MIN_PAKAGE_VAL: string;
  BARCODE1: string;
  BARCODE2: string;
  SUGGESTED_FREQUENCY: string;
  SUGGESTED_DOSE: string;
  TREATMENT_CATEGORY_CODE: string;
  TREATMENT_CATEGORY_NAME: string;
  PHARMACOLOGICAL_SEQ: string;
  PHARMACOLOGICAL_CODE: string;
  PHARMACOLOGICAL_NAME: string;
  INDICATION: string;
  HI_REGULATION: string;
  INSTRUCTIONS: string;
  IS_WARRING: string;
  IS_H_COST: string;
  SELF_PAY_MEDICINE: string;
  REFRIGERATED_MEDICINE: string;
  IS_BIO: string;
  DRUGKIND: string;
  PREGNANCY_LEVEL: string;
  BRD: string;
  LICENSE: string;
  SUPPLIER: string;
  SUPPLIER_LICENSE: string;
  TYPE: string;
  TORW: string;
  PIC_URL: string;
  PIC1_URL: string;
  PIL_URL: string;
  MANUAL_URL: string;
  FILE_STATUS: string;
  STORAGE_NOTE: string;
  NOTE: string;
  STORAGE: any[];
  DeviceBasics: any[];
}

export interface MedUnit {
  GUID: string;
  med_guid: string;
  unit_type: string;
  unit_name: string;
  quantity: string;
  sort_order: string;
  conversion_rate: string;
}

export interface ProcurementSubContent {
  GUID: string;
  Master_GUID: string;
  ACPT_SN: string;
  CODE: string;
  SKDIACODE: string;
  NAME: string;
  BARCODE1: string;
  BARCODE2: string;
  END_QTY: string;
  VAL: string;
  LOT: string;
  OP: string;
  OP_TIME: string;
  STATE: string;
  NOTE: string;
}

export interface ProcurementContent {
  GUID: string;
  Master_GUID: string;
  PON: string;
  INDEX: string;
  IC_SN: string;
  CODE: string;
  NAME: string;
  BRD: string;
  SKDIACODE: string;
  BARCODE1: string;
  BARCODE2: string;
  START_QTY: string;
  ADD_TIME: string;
  ORDER_TIME: string;
  DELIVERY_TIME: string;
  SEQ: string;
  FREE_CHARGE_FLAG: string;
  API_RETURN_NOTE: string;
  NOTE: string;
  Sub_content: ProcurementSubContent[];
}

export interface Classify {
  GUID: string;
  name: string;
  safe_day: string;
  standard_day: string;
}

export interface StockItemFromAPI {
  GUID: string;
  shelf_guid: string;
  location: string;
  ip: string;
  device_type: string;
  led_index: string;
  code: string;
  name: string;
  material_no: string;
  lot: string[];
  expiry_date: string[];
  qty: string[];
  Value: string;
  Classify_GUID: string;
  Classify: Classify;
  med_cloud: MedCloud;
  med_unit: MedUnit[];
  content: ProcurementContent[];
}

export interface ServerSettingItem {
  GUID: string;
  'department_type ': string;
  name: string;
  type: string;
  porgram_type: string;
  content: string;
  server: string;
  Port: string;
  DBName: string;
  tableName: string;
  user: string;
  password: string;
  value: string;
}

export interface InventoryItem {
  code: string;
  material_no: string;
  name: string;
  cht_name: string;
  unit: string;
  type: string;
  verified_qty: number;
  transit_qty: number;
  servers: ServerInventoryDetail[];
}

export interface ServerInventoryDetail {
  server_name: string;
  server_type: string;
  stock: number;
  safety: number;
  standard: number;
  lots: string[];
  expiry_dates: string[];
  quantities: string[];
  full_data: StockItemFromAPI;
}

export interface InventoryResponse {
  Data: InventoryItem[];
}

export interface ServerSettingsResponse {
  Data: ServerSettingItem[];
}

export interface StockResponse {
  Data: StockItemFromAPI[];
}
