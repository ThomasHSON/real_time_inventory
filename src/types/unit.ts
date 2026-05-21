export interface UnitDetail {
  GUID: string;
  med_guid: string;
  unit_type: string;
  unit_name: string;
  quantity: string;
  sort_order: string;
  conversion_rate: string;
}

export interface UnitDetailsResponse {
  Data: UnitDetail[];
}
