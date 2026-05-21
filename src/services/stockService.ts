import { apiCall } from '../utils/api';
import { ServerSettingResponse } from '../types/serverSetting';
import {
  StockResponse,
  StockRequest,
  CreateClassifyRequest,
  UpdateClassifyRequest,
  UpdateDrugClassifyRequest,
  ApiResponse,
  AllClassificationsResponse,
  DeleteClassifyRequest
} from '../types/stock';

export const getServerSettings = async (): Promise<ServerSettingResponse> => {
  return await apiCall('/api/ServerSetting/get_name', {
    method: 'POST',
    body: {},
  });
};

export const getStock = async (request: StockRequest): Promise<StockResponse> => {
  return await apiCall('/api/stock/get_stock', {
    method: 'POST',
    body: request,
  });
};

export const createClassify = async (request: CreateClassifyRequest): Promise<ApiResponse> => {
  return await apiCall('/api/medClassify/add', {
    method: 'POST',
    body: request,
  });
};

export const updateClassify = async (request: UpdateClassifyRequest): Promise<ApiResponse> => {
  return await apiCall('/api/medClassify/update', {
    method: 'POST',
    body: request,
  });
};

export const updateDrugClassify = async (request: UpdateDrugClassifyRequest): Promise<ApiResponse> => {
  return await apiCall('/api/stock/update_stock', {
    method: 'POST',
    body: request,
  });
};

export const getAllClassifications = async (): Promise<AllClassificationsResponse> => {
  return await apiCall('/api/medClassify/get_all', {
    method: 'POST',
    body: {},
  });
};

export const deleteClassify = async (request: DeleteClassifyRequest): Promise<ApiResponse> => {
  return await apiCall('/api/medClassify/delete', {
    method: 'POST',
    body: request,
  });
};
