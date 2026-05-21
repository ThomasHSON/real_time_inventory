export interface Permission {
  name: string;
  state: boolean;
}

export interface LoginData {
  ID: string;
  Password: string;
}

export interface UserData {
  GUID: string;
  ID: string;
  Name: string;
  Employer: string;
  loginTime: string;
  verifyTime: string;
  color: string;
  level: string;
  license: string;
  Permissions?: Permission[];
}

export interface LoginResponse {
  Data: UserData;
  Code: number;
  Result: string;
}