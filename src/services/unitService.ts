import { apiCall } from '../utils/api';
import { UnitDetail, UnitDetailsResponse } from '../types/unit';

export const fetchUnitDetails = async (medGuid: string): Promise<UnitDetail[]> => {
  try {
    const response: UnitDetailsResponse = await apiCall(`/api/units/${medGuid}`, {
      method: 'GET',
    });
    return response.Data || [];
  } catch (error) {
    console.error('Failed to fetch unit details:', error);
    throw error;
  }
};

export const getUnitsByMedGuid = async (medGuid: string): Promise<UnitDetail[]> => {
  try {
    const requestData = {
      ValueAry: [medGuid]
    };

    console.log('=== API Request: /api/medUnit/get_by_Med_GUID ===');
    console.log('Request Data:', requestData);
    console.log('Med GUID:', medGuid);

    const response: UnitDetailsResponse = await apiCall('/api/medUnit/get_by_Med_GUID', {
      method: 'POST',
      body: requestData,
    });

    console.log('Response:', response);

    return response.Data || [];
  } catch (error) {
    console.error('Failed to fetch unit details by med GUID:', error);
    console.error('Error details:', error);
    throw error;
  }
};

export const updateUnits = async (units: UnitDetail[]): Promise<void> => {
  try {
    const requestData = {
      Data: units
    };

    console.log('=== API Request: /api/medUnit/update ===');
    console.log('Request Data:', JSON.stringify(requestData, null, 2));

    await apiCall('/api/medUnit/update', {
      method: 'POST',
      body: requestData,
    });

    console.log('Units updated successfully');
  } catch (error) {
    console.error('Failed to update units:', error);
    throw error;
  }
};

export const mockFetchUnitDetails = async (medGuid: string): Promise<UnitDetail[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          GUID: 'U001',
          med_guid: medGuid,
          unit_type: '採購',
          unit_name: '盒',
          quantity: '3',
          sort_order: '1',
          conversion_rate: '',
        },
        {
          GUID: 'U002',
          med_guid: medGuid,
          unit_type: '撥補',
          unit_name: '瓶',
          quantity: '10',
          sort_order: '2',
          conversion_rate: '5',
        },
        {
          GUID: 'U003',
          med_guid: medGuid,
          unit_type: '調劑',
          unit_name: '顆',
          quantity: '1',
          sort_order: '3',
          conversion_rate: '10',
        },
      ]);
    }, 500);
  });
};
