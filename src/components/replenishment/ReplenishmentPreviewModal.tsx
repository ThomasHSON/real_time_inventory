import React, { useEffect, useState } from 'react';
import { X, FileText, Package, Trash2, Plus } from 'lucide-react';
import { ReplenishmentItem } from '../../types/replenishment';
import { UnitDetail } from '../../types/unit';
import { ServerSetting } from '../../types/serverSetting';
import { StockItem } from '../../types/stock';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useToast } from '../common/ToastContainer';
import { getServerSettings } from '../../services/serverSettingService';
import { getStock } from '../../services/stockService';
import { getLoggedName } from '../../services/auth';
import { apiCall } from '../../utils/api';

interface ReplenishmentPreview {
  code: string;
  itemCode: string;
  name: string;
  rawQuantity: number;
  adjustedQuantity: number;
  convertedUnit: string;
  conversionRate: number;
  displayUnitName: string;
  originalItem: ReplenishmentItem;
  sourceStock: number | null;
}

interface ReplenishmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReplenishmentItem[];
  onFetchUnitDetails: (medGuid: string) => Promise<UnitDetail[]>;
  destinationServerName: string;
}

export const ReplenishmentPreviewModal: React.FC<ReplenishmentPreviewModalProps> = ({
  isOpen,
  onClose,
  items,
  onFetchUnitDetails,
  destinationServerName,
}) => {
  const { showToast } = useToast();
  const [previews, setPreviews] = useState<ReplenishmentPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Map<string, { raw: number; converted: number }>>(new Map());
  const [warehouses, setWarehouses] = useState<ServerSetting[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<ServerSetting | null>(null);
  const [stockData, setStockData] = useState<Map<string, number>>(new Map());
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && items.length > 0 && selectedWarehouse) {
      calculatePreviews();
    }
  }, [isOpen, items, selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const response = await getServerSettings();
      const warehouseList = response.Data.filter(s => s.type === '藥庫');
      setWarehouses(warehouseList);
      if (warehouseList.length > 0) {
        setSelectedWarehouse(warehouseList[0]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchSourceStock = async (): Promise<Map<string, number>> => {
    if (!selectedWarehouse) {
      console.log('⚠️ No warehouse selected');
      return new Map();
    }

    try {
      console.log('=== Fetching Source Stock ===');
      console.log('Selected Warehouse:', selectedWarehouse);

      const response = await getStock({
        ServerName: selectedWarehouse.name,
        ServerType: selectedWarehouse.type
      });

      console.log('Stock API Response:', response);
      console.log('Stock Data Length:', response.Data?.length);

      setAllStockItems(response.Data || []);

      const stockMap = new Map<string, number>();
      response.Data.forEach((item: StockItem) => {
        let totalQty = 0;
        if (Array.isArray(item.qty)) {
          totalQty = item.qty.reduce((sum, q) => sum + parseFloat(q || '0'), 0);
          console.log(`📦 code: ${item.code} | qty array: ${JSON.stringify(item.qty)} = ${totalQty}`);
        } else {
          totalQty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty || '0');
          console.log(`📦 code: ${item.code} | qty: ${item.qty} = ${totalQty}`);
        }
        stockMap.set(item.code, totalQty);
      });

      console.log('Stock Map Size:', stockMap.size);
      console.log('Stock Map Keys (codes):', Array.from(stockMap.keys()));

      setStockData(stockMap);
      return stockMap;
    } catch (error) {
      console.error('❌ Failed to fetch source stock:', error);
      return new Map();
    }
  };

  const calculatePreviews = async () => {
    setIsLoading(true);
    try {
      const previewPromises = items.map(async (item) => {
        const rawQuantity = Math.max(0, item.standardQuantity - item.currentStock);

        if (!item.medGuid) {
          return {
            code: item.code,
            itemCode: item.material_no,
            name: item.name,
            rawQuantity,
            adjustedQuantity: rawQuantity,
            convertedUnit: `${rawQuantity} (無單位資訊)`,
            conversionRate: 1,
            displayUnitName: '',
            originalItem: item,
            sourceStock: null,
          };
        }

        try {
          const units = await onFetchUnitDetails(item.medGuid);

          if (!units || units.length === 0) {
            return {
              code: item.code,
              itemCode: item.material_no,
              name: item.name,
              rawQuantity,
              adjustedQuantity: rawQuantity,
              convertedUnit: `${rawQuantity} (無單位資訊)`,
              conversionRate: 1,
              displayUnitName: '',
              originalItem: item,
              sourceStock: null,
            };
          }

          const sortedUnits = [...units].sort((a, b) => parseInt(a.sort_order) - parseInt(b.sort_order));
          const smallestUnit = sortedUnits[sortedUnits.length - 1];

          if (!smallestUnit || !smallestUnit.conversion_rate) {
            const fallbackUnit = smallestUnit?.unit_name || '';
            return {
              code: item.code,
              itemCode: item.material_no,
              name: item.name,
              rawQuantity,
              adjustedQuantity: rawQuantity,
              convertedUnit: `${rawQuantity} ${fallbackUnit}`,
              conversionRate: 1,
              displayUnitName: fallbackUnit,
              originalItem: item,
              sourceStock: null,
            };
          }

          const smallestSortOrder = parseInt(smallestUnit.sort_order);
          const displayUnitSortOrder = smallestSortOrder - 1;

          let displayUnitName: string;
          if (displayUnitSortOrder < 1) {
            displayUnitName = smallestUnit.unit_name;
          } else {
            const displayUnit = units.find(u => parseInt(u.sort_order) === displayUnitSortOrder);
            displayUnitName = displayUnit?.unit_name || smallestUnit.unit_name;
          }

          const conversionRate = parseFloat(smallestUnit.conversion_rate);
          const minQuantity = parseFloat(smallestUnit.quantity) || 0;

          let adjustedQuantity = Math.ceil(rawQuantity / conversionRate) * conversionRate;
          if (adjustedQuantity < minQuantity) {
            adjustedQuantity = minQuantity;
          }

          const convertedCount = adjustedQuantity / conversionRate;

          return {
            code: item.code,
            itemCode: item.material_no,
            name: item.name,
            rawQuantity,
            adjustedQuantity,
            convertedUnit: `${convertedCount} ${displayUnitName}`,
            conversionRate,
            displayUnitName,
            originalItem: item,
            sourceStock: null,
          };
        } catch (error) {
          console.error(`Failed to fetch units for ${item.code}:`, error);
          return {
            code: item.code,
            itemCode: item.material_no,
            name: item.name,
            rawQuantity,
            adjustedQuantity: rawQuantity,
            convertedUnit: `${rawQuantity} (無法取得單位)`,
            conversionRate: 1,
            displayUnitName: '',
            originalItem: item,
            sourceStock: null,
          };
        }
      });

      const results = await Promise.all(previewPromises);
      console.log('=== Calculate Previews Results ===');
      console.log('Results count:', results.length);
      console.log('Preview codes:', results.map(r => r.code));

      const freshStockData = await fetchSourceStock();
      console.log('Fresh Stock Data Size:', freshStockData.size);

      const resultsWithStock = results.map(preview => {
        const itemCode = preview.code;
        const stock = freshStockData.get(itemCode) ?? null;
        console.log(`🔍 Matching stock for code: ${itemCode} | stock: ${stock}`);
        return {
          ...preview,
          sourceStock: stock
        };
      });

      console.log('Results with stock:', resultsWithStock.map(r => ({ code: r.code, sourceStock: r.sourceStock })));

      setPreviews(resultsWithStock);

      const initialQuantities = new Map<string, { raw: number; converted: number }>();
      resultsWithStock.forEach(preview => {
        const convertedCount = preview.adjustedQuantity / preview.conversionRate;
        initialQuantities.set(preview.code, {
          raw: preview.rawQuantity,
          converted: convertedCount
        });
      });
      setEditedQuantities(initialQuantities);
    } catch (error) {
      console.error('Failed to calculate previews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRawQuantityChange = async (code: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const preview = previews.find(p => p.code === code);
    if (!preview || !preview.originalItem.medGuid) return;

    try {
      const units = await onFetchUnitDetails(preview.originalItem.medGuid);
      if (!units || units.length === 0) {
        const adjustedQuantity = Math.ceil(numValue / preview.conversionRate) * preview.conversionRate;
        const convertedCount = adjustedQuantity / preview.conversionRate;
        setEditedQuantities(prev => {
          const newMap = new Map(prev);
          newMap.set(code, { raw: numValue, converted: convertedCount });
          return newMap;
        });
        return;
      }

      const sortedUnits = [...units].sort((a, b) => parseInt(a.sort_order) - parseInt(b.sort_order));
      const smallestUnit = sortedUnits[sortedUnits.length - 1];
      const minQuantity = parseFloat(smallestUnit.quantity) || 0;

      let adjustedQuantity = Math.ceil(numValue / preview.conversionRate) * preview.conversionRate;
      if (adjustedQuantity < minQuantity) {
        adjustedQuantity = minQuantity;
      }

      const convertedCount = adjustedQuantity / preview.conversionRate;

      setEditedQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(code, { raw: numValue, converted: convertedCount });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to fetch units for quantity adjustment:', error);
      const adjustedQuantity = Math.ceil(numValue / preview.conversionRate) * preview.conversionRate;
      const convertedCount = adjustedQuantity / preview.conversionRate;
      setEditedQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(code, { raw: numValue, converted: convertedCount });
        return newMap;
      });
    }
  };

  const handleConvertedQuantityChange = (code: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const preview = previews.find(p => p.code === code);
    if (!preview) return;

    const adjustedQuantity = numValue * preview.conversionRate;

    setEditedQuantities(prev => {
      const newMap = new Map(prev);
      newMap.set(code, { raw: adjustedQuantity, converted: numValue });
      return newMap;
    });
  };

  const getDisplayQuantities = (preview: ReplenishmentPreview) => {
    const edited = editedQuantities.get(preview.code);
    if (edited) {
      const adjustedQuantity = edited.converted * preview.conversionRate;
      return {
        rawQuantity: edited.raw,
        adjustedQuantity,
        convertedCount: edited.converted
      };
    }
    return {
      rawQuantity: preview.rawQuantity,
      adjustedQuantity: preview.adjustedQuantity,
      convertedCount: preview.adjustedQuantity / preview.conversionRate
    };
  };

  const handleDeleteItem = (code: string) => {
    setPreviews(prev => prev.filter(p => p.code !== code));
    setEditedQuantities(prev => {
      const newMap = new Map(prev);
      newMap.delete(code);
      return newMap;
    });
  };

  const filteredSearchResults = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const existingCodes = new Set(previews.map(p => p.code));

    const term = searchTerm.toLowerCase();
    const matchedItems = allStockItems.filter((item: StockItem) => {
      if (existingCodes.has(item.code)) {
        return false;
      }

      const codeMatch = item.code?.toLowerCase().includes(term);
      const nameMatch = item.name?.toLowerCase().includes(term);
      const chtNameMatch = item.cht_name?.toLowerCase().includes(term);
      const materialMatch = item.material_no?.toLowerCase().includes(term);

      return codeMatch || nameMatch || chtNameMatch || materialMatch;
    });

    const uniqueItems = new Map<string, StockItem>();
    matchedItems.forEach((item) => {
      if (!uniqueItems.has(item.code)) {
        uniqueItems.set(item.code, item);
      }
    });

    return Array.from(uniqueItems.values());
  }, [searchTerm, allStockItems, previews]);

  const handleAddDrug = async (drugItem: StockItem) => {
    if (previews.some(p => p.code === drugItem.code)) {
      showToast('此藥品已在列表中', 'warning');
      return;
    }

    const replenishmentItem: ReplenishmentItem = {
      code: drugItem.code,
      name: drugItem.name,
      material_no: drugItem.material_no,
      currentStock: 0,
      safeStock: 0,
      standardQuantity: 0,
      medGuid: drugItem.GUID
    };

    try {
      const units = await onFetchUnitDetails(drugItem.med_cloud.GUID);

      let newPreview: ReplenishmentPreview;

      if (!units || units.length === 0) {
        newPreview = {
          code: drugItem.code,
          itemCode: drugItem.material_no,
          name: drugItem.name,
          rawQuantity: 0,
          adjustedQuantity: 0,
          convertedUnit: '0 (無單位資訊)',
          conversionRate: 1,
          displayUnitName: '',
          originalItem: replenishmentItem,
          sourceStock: stockData.get(drugItem.code) ?? null,
        };
      } else {
        const sortedUnits = [...units].sort((a, b) => parseInt(a.sort_order) - parseInt(b.sort_order));
        const smallestUnit = sortedUnits[sortedUnits.length - 1];

        if (!smallestUnit || !smallestUnit.conversion_rate) {
          const fallbackUnit = smallestUnit?.unit_name || '';
          newPreview = {
            code: drugItem.code,
            itemCode: drugItem.material_no,
            name: drugItem.name,
            rawQuantity: 0,
            adjustedQuantity: 0,
            convertedUnit: `0 ${fallbackUnit}`,
            conversionRate: 1,
            displayUnitName: fallbackUnit,
            originalItem: replenishmentItem,
            sourceStock: stockData.get(drugItem.code) ?? null,
          };
        } else {
          const smallestSortOrder = parseInt(smallestUnit.sort_order);
          const displayUnitSortOrder = smallestSortOrder - 1;

          let displayUnitName: string;
          if (displayUnitSortOrder < 1) {
            displayUnitName = smallestUnit.unit_name;
          } else {
            const displayUnit = units.find(u => parseInt(u.sort_order) === displayUnitSortOrder);
            displayUnitName = displayUnit?.unit_name || smallestUnit.unit_name;
          }

          const conversionRate = parseFloat(smallestUnit.conversion_rate);

          newPreview = {
            code: drugItem.code,
            itemCode: drugItem.material_no,
            name: drugItem.name,
            rawQuantity: 0,
            adjustedQuantity: 0,
            convertedUnit: `0 ${displayUnitName}`,
            conversionRate,
            displayUnitName,
            originalItem: replenishmentItem,
            sourceStock: stockData.get(drugItem.code) ?? null,
          };
        }
      }

      setPreviews(prev => [...prev, newPreview]);
      setEditedQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(drugItem.code, { raw: 0, converted: 0 });
        return newMap;
      });

      setShowAddForm(false);
      setSearchTerm('');
      showToast('藥品已成功新增', 'success');
    } catch (error) {
      console.error('Failed to add drug:', error);
      showToast('新增藥品失敗', 'error');
    }
  };

  const handleConfirm = async () => {
    if (!selectedWarehouse) {
      showToast('請選擇庫別', 'warning');
      return;
    }

    if (previews.length === 0) {
      showToast('請至少選擇一個藥品', 'warning');
      return;
    }

    const userName = getLoggedName();
    if (!userName) {
      showToast('無法取得登入者資訊', 'error');
      return;
    }

    const requestData = {
      Data: previews.map(preview => {
        const editedQty = editedQuantities.get(preview.code);
        const adjustedQuantity = editedQty ? editedQty.raw : preview.adjustedQuantity;

        return {
          sourceStoreType: selectedWarehouse.name,
          destinationStoreType: destinationServerName,
          code: preview.code,
          name: preview.name,
          sourceStoreInventory: String(preview.sourceStock ?? 0),
          issuedQuantity: String(adjustedQuantity),
          reportName: userName,
          state: '等待過帳'
        };
      })
    };

    try {
      setIsLoading(true);
      await apiCall('/api/drugStotreDistribution/add', {
        method: 'POST',
        body: requestData
      });

      showToast('撥補單建立成功', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to create replenishment:', error);
      showToast('撥補單建立失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">建立撥補單預覽</h2>
                <p className="text-sm text-slate-600">共 {items.length} 項需撥補藥品</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {warehouses.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">來源庫別：</label>
                <select
                  value={selectedWarehouse?.name || ''}
                  onChange={(e) => {
                    const selected = warehouses.find(w => w.name === e.target.value);
                    setSelectedWarehouse(selected || null);
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.name} value={warehouse.name}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                新增藥品
              </button>
            </div>
          )}
        </div>

        {showAddForm && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="搜尋藥碼、料號或藥名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
              >
                取消
              </button>
            </div>

            {filteredSearchResults.length > 0 && (
              <div className="mt-3 bg-white rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                {filteredSearchResults.map((drug) => (
                  <div
                    key={drug.GUID}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-2 py-1 bg-slate-700 text-white text-xs rounded font-mono">
                          {drug.code}
                        </span>
                        {drug.material_no && (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                            {drug.material_no}
                          </span>
                        )}
                        <span className="font-medium text-slate-800">{drug.name}</span>
                      </div>
                      {drug.cht_name && (
                        <p className="text-sm text-slate-500 mt-1">{drug.cht_name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddDrug(drug)}
                      className="ml-4 px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      新增
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchTerm && filteredSearchResults.length === 0 && (
              <div className="mt-3 text-center text-slate-500 py-4">
                未找到符合的藥品
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : previews.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">無需撥補的藥品</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-base font-semibold text-slate-700 uppercase tracking-wider">
                      藥碼
                    </th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-slate-700 uppercase tracking-wider">
                      料號
                    </th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-slate-700 uppercase tracking-wider">
                      藥名
                    </th>
                    <th className="px-4 py-3 text-right text-base font-semibold text-slate-700 uppercase tracking-wider">
                      來源庫存
                    </th>
                    <th className="px-4 py-3 text-right text-base font-semibold text-slate-700 uppercase tracking-wider">
                      原始數量
                    </th>
                    <th className="px-4 py-3 text-right text-base font-semibold text-slate-700 uppercase tracking-wider">
                      調整後數量
                    </th>
                    <th className="px-4 py-3 text-right text-base font-semibold text-slate-700 uppercase tracking-wider">
                      撥補數量
                    </th>
                    <th className="px-4 py-3 text-center text-base font-semibold text-slate-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {previews.map((preview, index) => {
                    const quantities = getDisplayQuantities(preview);
                    return (
                      <tr
                        key={`${preview.code}-${index}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm">
                            {preview.code}
                        </td>
                        <td className="px-4 py-3 text-sm">
                            {preview.itemCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                          {preview.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-semibold ${preview.sourceStock !== null && preview.sourceStock < quantities.adjustedQuantity ? 'text-red-600' : 'text-green-600'}`}>
                            {preview.sourceStock !== null ? preview.sourceStock : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={quantities.rawQuantity}
                            onChange={(e) => handleRawQuantityChange(preview.code, e.target.value)}
                            className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={quantities.adjustedQuantity !== quantities.rawQuantity ? 'font-semibold text-orange-600' : 'text-slate-600'}>
                            {quantities.adjustedQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={quantities.convertedCount}
                              onChange={(e) => handleConvertedQuantityChange(preview.code, e.target.value)}
                              className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-blue-600"
                            />
                            {preview.displayUnitName && (
                              <span className="text-slate-600 font-medium">{preview.displayUnitName}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => handleDeleteItem(preview.code)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                            title="刪除此項目"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || previews.length === 0 || !selectedWarehouse}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            確認建立
          </button>
        </div>
      </div>
    </div>
  );
};
