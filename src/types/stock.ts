export interface Classify {
  GUID: string;
  name: string;
  safe_day: number | string;
  standard_day: number | string;
}

export interface MedCloud {
  GUID: string;
  TYPE: string;
  [key: string]: any;
}

export interface StockItem {
  GUID: string;
  code: string;
  name: string;
  cht_name: string;
  material_no: string;
  Classify_GUID: string;
  Classify: Classify | null;
  qty: number | string[];
  unit: string;
  med_cloud: MedCloud | null;
}

export interface StockResponse {
  Code: number;
  Result: string;
  Data: StockItem[];
}

export interface StockRequest {
  ServerName: string;
  ServerType: string;
}

export interface CreateClassifyRequest {
  Data: {
    name: string;
    safe_day: string;
    standard_day: string;
  };
}

export interface UpdateClassifyRequest {
  Data: {
    GUID: string;
    name: string;
    safe_day: string;
    standard_day: string;
  };
}

export interface UpdateDrugClassifyItem {
  GUID: string;
  Classify_GUID: string;
}

export interface UpdateDrugClassifyRequest {
  ServerName: string;
  ServerType: string;
  Data: UpdateDrugClassifyItem | UpdateDrugClassifyItem[];
}

export interface ApiResponse {
  Code: number;
  Result: string;
  Data?: any;
}

export interface AllClassificationsResponse {
  Code: number;
  Result: string;
  Data: Classify[];
}

export interface DeleteClassifyRequest {
  Data: {
    GUID: string;
  };
}
