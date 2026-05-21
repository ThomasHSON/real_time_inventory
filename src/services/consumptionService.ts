import { apiCall } from '../utils/api';
import { ConsumptionRequest, ConsumptionResponse } from '../types/consumption';

export const getAvgConsumption = async (request: ConsumptionRequest): Promise<ConsumptionResponse> => {
  return await apiCall('/api/consumption/get_avg_by_start_end', {
    method: 'POST',
    body: request
  });
};
