import { loadConfig, getApiUrl } from '../config';

export interface ApiCallOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  responseType?: 'json' | 'blob';
}

export const apiCall = async (path: string, options: ApiCallOptions = {}): Promise<any> => {
  // Ensure config is loaded
  await loadConfig();

  const url = getApiUrl(path);
  const { method = 'GET', headers = {}, body, responseType = 'json' } = options;

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  console.log(`API Call: ${method} ${url}`, body ? { body } : '');

  try {
    const response = await fetch(url, requestOptions);

    console.log(`API Response: ${method} ${url} - Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response: ${method} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    if (responseType === 'blob') {
      const blob = await response.blob();
      console.log(`API Success Response (blob): ${method} ${url}`, { size: blob.size });
      return blob;
    }

    const data = await response.json();
    console.log(`API Success Response: ${method} ${url}`, data);
    return data;
  } catch (error) {
    console.error(`API call failed: ${method} ${url}`, error);
    throw error;
  }
};