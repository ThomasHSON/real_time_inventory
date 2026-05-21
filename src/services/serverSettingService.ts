import { apiCall } from '../utils/api';
import { ServerSettingResponse } from '../types/serverSetting';

export const getServerSettings = async (): Promise<ServerSettingResponse> => {
  return await apiCall('/api/ServerSetting/get_name', {
    method: 'POST',
    body: {}
  });
};
