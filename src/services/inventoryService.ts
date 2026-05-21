import { apiCall } from '../utils/api';
import {
  ServerSettingsResponse,
  StockResponse,
  InventoryItem,
  ServerInventoryDetail,
  StockItemFromAPI
} from '../types/inventory';
import { getAvgConsumption } from './consumptionService';

export const getInventoryData = async (): Promise<InventoryItem[]> => {
  try {
    const serverSettingsResponse = await apiCall<ServerSettingsResponse>(
      '/api/ServerSetting/get_name',
      {
        method: 'POST',
        body: {}
      }
    );

    const servers = serverSettingsResponse.Data;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const stockPromises = servers.map(server =>
      Promise.all([
        apiCall<StockResponse>('/api/stock/get_stock', {
          method: 'POST',
          body: {
            ServerName: server.name,
            ServerType: server.type
          }
        }),
        getAvgConsumption({
          ValueAry: [formatDate(startDate), formatDate(endDate)],
          ServerName: server.name,
          ServerType: server.type
        })
      ]).then(([stockResponse, consumptionResponse]) => ({
        server,
        stockData: stockResponse.Data,
        consumptionData: consumptionResponse.Data
      }))
    );

    const stockResults = await Promise.all(stockPromises);

    const drugMap = new Map<string, {
      code: string;
      material_no: string;
      name: string;
      cht_name: string;
      unit: string;
      type: string;
      verified_qty: number;
      transit_qty: number;
      servers: ServerInventoryDetail[];
    }>();

    stockResults.forEach(({ server, stockData, consumptionData }) => {
      const consumptionMap = new Map(
        consumptionData.map(item => [
          item.CODE,
          typeof item.ANG_QTY === 'string'
            ? parseFloat(item.ANG_QTY) || 0
            : item.ANG_QTY || 0
        ])
      );

      stockData.forEach((item: StockItemFromAPI) => {
        const code = item.code;

        const totalQty = item.qty.reduce((sum, q) => sum + parseFloat(q || '0'), 0);

        const verifiedQty = item.content.reduce((sum, content) => {
          const subContentQty = content.Sub_content.reduce((subSum, sub) => {
            return subSum + parseFloat(sub.END_QTY || '0');
          }, 0);
          return sum + subContentQty;
        }, 0);

        const transitQty = item.content.reduce((sum, content) => {
          const hasSubContent = content.Sub_content && content.Sub_content.length > 0;
          if (!hasSubContent) {
            return sum + parseFloat(content.START_QTY || '0');
          }
          return sum;
        }, 0);

        const avgConsumption = consumptionMap.get(code) || 0;
        const safeDay = parseFloat(item.Classify?.safe_day || '0');
        const standardDay = parseFloat(item.Classify?.standard_day || '0');

        const safetyQuantity = avgConsumption * safeDay;
        const standardQuantity = avgConsumption * standardDay;

        const serverDetail: ServerInventoryDetail = {
          server_name: server.name,
          server_type: server.type,
          stock: totalQty,
          safety: safetyQuantity,
          standard: standardQuantity,
          lots: item.lot || [],
          expiry_dates: item.expiry_date || [],
          quantities: item.qty || [],
          full_data: item
        };

        if (drugMap.has(code)) {
          const existing = drugMap.get(code)!;
          existing.servers.push(serverDetail);
          existing.verified_qty = Math.max(existing.verified_qty, verifiedQty);
          existing.transit_qty = Math.max(existing.transit_qty, transitQty);
        } else {
          drugMap.set(code, {
            code: item.code,
            material_no: item.material_no,
            name: item.name,
            cht_name: item.med_cloud?.CHT_NAME || '',
            unit: item.med_cloud?.MIN_PAKAGE || '',
            type: item.med_cloud?.TYPE || '',
            verified_qty: verifiedQty,
            transit_qty: transitQty,
            servers: [serverDetail]
          });
        }
      });
    });

    return Array.from(drugMap.values());
  } catch (error) {
    console.error('Failed to fetch inventory data:', error);
    throw error;
  }
};
