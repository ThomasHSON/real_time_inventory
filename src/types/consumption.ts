export interface ConsumptionItem {
  CODE: string;
  ANG_QTY: string | number;
}

export interface ConsumptionRequest {
  ValueAry: [string, string];
  ServerName: string;
  ServerType: string;
}

export interface ConsumptionResponse {
  Code: number;
  Result: string;
  Data: ConsumptionItem[];
}
