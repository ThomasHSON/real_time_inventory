import React, { useState, useEffect, useMemo } from 'react';
import { ServerSetting } from '../types/serverSetting';
import { StockItem } from '../types/stock';
import { ReplenishmentItem } from '../types/replenishment';
import { getServerSettings } from '../services/serverSettingService';
import { getStock } from '../services/stockService';
import { getAvgConsumption } from '../services/consumptionService';
import { getUnitsByMedGuid, updateUnits } from '../services/unitService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ContextMenu } from '../components/inventory/ContextMenu';
import { UnitDetailsModal } from '../components/inventory/UnitDetailsModal';
import { ProcurementPreviewModal } from '../components/procurement/ProcurementPreviewModal';
import { FileText } from 'lucide-react';

type SortField = 'code' | 'material_no' | 'name' | 'type' | 'currentStock' | 'avgDailyConsumption' | 'safetyQuantity' | 'standardQuantity';
type SortDirection = 'asc' | 'desc' | null;

export const ProcurementPage: React.FC = () => {
  const [serverSettings, setServerSettings] = useState<ServerSetting[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerSetting | null>(null);
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentItem[]>([]);
  const [selectedDrugTypes, setSelectedDrugTypes] = useState<Set<string>>(new Set(['all']));
  const [fileStatusFilter, setFileStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReplenishmentItem | null>(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [manuallySelectedItems, setManuallySelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    fetchServerSettings();
  }, []);

  const fetchServerSettings = async () => {
    try {
      setLoading(true);
      const response = await getServerSettings();

      if (response.Code === 200 && response.Data) {
        const filteredServers = response.Data.filter(server => server.type == '藥庫');
        setServerSettings(filteredServers);

        if (filteredServers.length > 0) {
          setSelectedServer(filteredServers[0]);
          fetchReplenishmentData(filteredServers[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch server settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplenishmentData = async (server: ServerSetting) => {
    try {
      setDataLoading(true);

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

      const [stockResponse, consumptionResponse] = await Promise.all([
        getStock({ ServerName: server.name, ServerType: server.type }),
        getAvgConsumption({
          ValueAry: [formatDate(startDate), formatDate(endDate)],
          ServerName: server.name,
          ServerType: server.type
        })
      ]);

      if (stockResponse.Code === 200 && consumptionResponse.Code === 200) {
        const consumptionMap = new Map(
          consumptionResponse.Data.map(item => [
            item.CODE,
            typeof item.ANG_QTY === 'string'
              ? parseFloat(item.ANG_QTY) || 0
              : item.ANG_QTY || 0
          ])
        );


        const replenishmentItems: ReplenishmentItem[] = stockResponse.Data.map((stock: StockItem) => {
          const avgConsumption = consumptionMap.get(stock.code) || 0;
          const safeDay = typeof stock.Classify?.safe_day === 'string'
            ? parseFloat(stock.Classify.safe_day) || 0
            : stock.Classify?.safe_day || 0;
          const standardDay = typeof stock.Classify?.standard_day === 'string'
            ? parseFloat(stock.Classify.standard_day) || 0
            : stock.Classify?.standard_day || 0;

          const totalStock = Array.isArray(stock.qty)
            ? stock.qty.reduce((sum, qty) => {
                const qtyNum = typeof qty === 'string' ? parseFloat(qty) || 0 : qty || 0;
                return sum + qtyNum;
              }, 0)
            : 0;

          return {
            code: stock.code,
            material_no: stock.material_no,
            name: stock.cht_name || stock.name,
            type: stock.med_cloud?.TYPE || '',
            currentStock: totalStock,
            avgDailyConsumption: avgConsumption,
            safetyQuantity: avgConsumption * safeDay,
            standardQuantity: avgConsumption * standardDay,
            medGuid: stock.med_cloud?.GUID,
            fileStatus: stock.med_cloud?.FILE_STATUS || ''
          };
        });

        setReplenishmentData(replenishmentItems);
      }
    } catch (error) {
      console.error('Failed to fetch replenishment data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleServerChange = (server: ServerSetting) => {
    setSelectedServer(server);
    fetchReplenishmentData(server);
  };

  const handleContextMenu = (e: React.MouseEvent, item: ReplenishmentItem) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedItem(item);
  };

  const handleCloseContextMenu = () => {
    setContextMenuPosition(null);
    setSelectedItem(null);
  };

  const handleViewUnitDetails = () => {
    setShowUnitModal(true);
  };

  const handleContextMenuClose = () => {
    setContextMenuPosition(null);
  };

  const drugTypes = useMemo(() => {
    const types = new Set<string>();
    replenishmentData.forEach(item => {
      if (item.type) {
        types.add(item.type);
      }
    });
    return Array.from(types).sort();
  }, [replenishmentData]);

  const handleDrugTypeToggle = (type: string) => {
    setSelectedDrugTypes(prev => {
      const newSet = new Set(prev);

      if (type === 'all') {
        return new Set(['all']);
      }

      newSet.delete('all');

      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }

      if (newSet.size === 0) {
        return new Set(['all']);
      }

      return newSet;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredData = useMemo(() => {
    let data = selectedDrugTypes.has('all')
      ? replenishmentData
      : replenishmentData.filter(item => selectedDrugTypes.has(item.type));

    if (fileStatusFilter === 'open') {
      data = data.filter(item => item.fileStatus === '開檔中' || item.fileStatus === '');
    } else if (fileStatusFilter === 'closed') {
      data = data.filter(item => item.fileStatus === '關檔中');
    }

    const groupedByCode = data.reduce((acc, item) => {
      if (!acc[item.code]) {
        acc[item.code] = { ...item };
      } else {
        acc[item.code].currentStock += item.currentStock;
      }
      return acc;
    }, {} as Record<string, ReplenishmentItem>);

    const mergedData = Object.values(groupedByCode);

    if (sortField && sortDirection) {
      mergedData.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'code':
            aValue = a.code;
            bValue = b.code;
            break;
          case 'material_no':
            aValue = a.material_no;
            bValue = b.material_no;
            break;
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'type':
            aValue = a.type || '';
            bValue = b.type || '';
            break;
          case 'currentStock':
            aValue = a.currentStock;
            bValue = b.currentStock;
            break;
          case 'avgDailyConsumption':
            aValue = a.avgDailyConsumption;
            bValue = b.avgDailyConsumption;
            break;
          case 'safetyQuantity':
            aValue = a.safetyQuantity;
            bValue = b.safetyQuantity;
            break;
          case 'standardQuantity':
            aValue = a.standardQuantity;
            bValue = b.standardQuantity;
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      return mergedData;
    }

    return mergedData.sort((a, b) => {
      const aIsLow = a.currentStock < a.safetyQuantity;
      const bIsLow = b.currentStock < b.safetyQuantity;

      if (aIsLow && !bIsLow) return -1;
      if (!aIsLow && bIsLow) return 1;

      return a.code.localeCompare(b.code);
    });
  }, [replenishmentData, selectedDrugTypes, fileStatusFilter, sortField, sortDirection]);

  const itemsNeedingReplenishment = useMemo(() => {
    return filteredData.filter(item => item.currentStock < item.safetyQuantity);
  }, [filteredData]);

  const handleCreateReplenishment = () => {
    if (itemsNeedingReplenishment.length === 0) {
      alert('目前沒有需要採購的藥品');
      return;
    }
    setShowPreviewModal(true);
  };

  const handleCreateManualReplenishment = () => {
    if (manuallySelectedItems.size === 0) {
      alert('請至少選擇一個品項');
      return;
    }
    setShowPreviewModal(true);
  };

  const handleToggleItemSelection = (code: string) => {
    setManuallySelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleToggleAllItems = () => {
    if (manuallySelectedItems.size === filteredData.length) {
      setManuallySelectedItems(new Set());
    } else {
      setManuallySelectedItems(new Set(filteredData.map(item => item.code)));
    }
  };

  const manuallySelectedReplenishmentItems = useMemo(() => {
    return filteredData.filter(item => manuallySelectedItems.has(item.code));
  }, [filteredData, manuallySelectedItems]);


  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex-1">
            <div className="flex flex-wrap gap-2">
              {serverSettings.map((server) => (
                <button
                  key={`${server.name}-${server.type}`}
                  onClick={() => handleServerChange(server)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedServer?.name === server.name && selectedServer?.type === server.type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {server.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">檔案狀態:</label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFileStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    fileStatusFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFileStatusFilter('open')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    fileStatusFilter === 'open'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  開檔中
                </button>
                <button
                  onClick={() => setFileStatusFilter('closed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    fileStatusFilter === 'closed'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  關檔中
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">藥品類別:</label>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateReplenishment}
                  disabled={itemsNeedingReplenishment.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  <FileText size={18} />
                  自動建立採購單 {itemsNeedingReplenishment.length > 0 && `(${itemsNeedingReplenishment.length})`}
                </button>
                <button
                  onClick={handleCreateManualReplenishment}
                  disabled={manuallySelectedItems.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  <FileText size={18} />
                  建立選擇品項採購單 {manuallySelectedItems.size > 0 && `(${manuallySelectedItems.size})`}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleDrugTypeToggle('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDrugTypes.has('all')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                全部類別
              </button>
              {drugTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleDrugTypeToggle(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedDrugTypes.has(type)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedServer && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedServer.name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">建議採購資訊（最近30天平均消耗量）</p>
          </div>

          {dataLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="sticky top-0 px-6 py-3 text-center text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10">
                      <input
                        type="checkbox"
                        checked={manuallySelectedItems.size === filteredData.length && filteredData.length > 0}
                        onChange={handleToggleAllItems}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th onClick={() => handleSort('code')} className="sticky top-0 px-6 py-3 text-left text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      藥碼
                    </th>
                    <th onClick={() => handleSort('material_no')} className="sticky top-0 px-6 py-3 text-left text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      料號
                    </th>
                    <th onClick={() => handleSort('name')} className="sticky top-0 px-6 py-3 text-left text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      藥名
                    </th>
                    <th onClick={() => handleSort('type')} className="sticky top-0 px-6 py-3 text-left text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      種類
                    </th>
                    <th onClick={() => handleSort('currentStock')} className="sticky top-0 px-6 py-3 text-right text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      庫存
                    </th>
                    <th onClick={() => handleSort('avgDailyConsumption')} className="sticky top-0 px-6 py-3 text-right text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      平均日消耗量
                    </th>
                    <th onClick={() => handleSort('safetyQuantity')} className="sticky top-0 px-6 py-3 text-right text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      安全量
                    </th>
                    <th onClick={() => handleSort('standardQuantity')} className="sticky top-0 px-6 py-3 text-right text-base font-medium text-gray-600 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">
                      基準量
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                        無資料
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => {
                      const isLowStock = item.currentStock < item.safetyQuantity;
                      return (
                        <tr
                          key={`${item.code}-${index}`}
                          onContextMenu={(e) => handleContextMenu(e, item)}
                          className={`transition-colors cursor-context-menu ${
                            isLowStock
                              ? 'bg-red-50 hover:bg-red-100'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={manuallySelectedItems.has(item.code)}
                              onChange={() => handleToggleItemSelection(item.code)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.code}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.material_no}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.type}</td>
                          <td className={`px-6 py-4 text-sm text-right ${
                            isLowStock ? 'text-red-700 font-semibold' : 'text-gray-900'
                          }`}>
                            {item.currentStock.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.avgDailyConsumption.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.safetyQuantity.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.standardQuantity.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {contextMenuPosition && selectedItem && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          onClose={handleContextMenuClose}
          onViewUnitDetails={handleViewUnitDetails}
        />
      )}

      {showUnitModal && selectedItem && selectedItem.medGuid && (
        <UnitDetailsModal
          isOpen={showUnitModal}
          onClose={() => {
            setShowUnitModal(false);
            setSelectedItem(null);
          }}
          medGuid={selectedItem.medGuid}
          medName={selectedItem.name}
          onFetchUnitDetails={getUnitsByMedGuid}
          onUpdateUnits={updateUnits}
        />
      )}

      <ProcurementPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setManuallySelectedItems(new Set());
        }}
        items={manuallySelectedItems.size > 0 ? manuallySelectedReplenishmentItems : itemsNeedingReplenishment}
        onFetchUnitDetails={getUnitsByMedGuid}
        destinationServerName={selectedServer?.name || ''}
      />
    </div>
  );
};
