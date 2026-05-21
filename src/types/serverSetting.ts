export interface ServerSetting {
  name: string;
  type: string;
}

export interface ServerSettingResponse {
  Code: number;
  Result: string;
  Data: ServerSetting[];
}
