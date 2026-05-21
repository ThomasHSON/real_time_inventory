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

interface ProcurementPreview {
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
  minProcurementQuantity: number;
  smallestUnitConversionRate: number;
  smallestUnitName: string;
}

interface ProcurementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReplenishmentItem[];
  onFetchUnitDetails: (medGuid: string) => Promise<UnitDetail[]>;
  destinationServerName: string;
}

export const ProcurementPreviewModal: React.FC<ProcurementPreviewModalProps> = ({
  isOpen,
  onClose,
  items,
  onFetchUnitDetails,
  destinationServerName,
}) => {
  const { showToast } = useToast();
  const [previews, setPreviews] = useState<ProcurementPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Map<string, { raw: number; converted: number }>>(new Map());
  const [warehouses, setWarehouses] = useState<ServerSetting[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<ServerSetting | null>(null);
  const [stockData, setStockData] = useState<Map<string, number>>(new Map());
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorInput, setVendorInput] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const VENDOR_LIST = [
    '大昌', '久裕', '亞洲', '中外', '裕利', '和安', '大隆', '永福', '永茂', '平廷',
    '齡富', '登詮', '宜泰', 'CENRA', '尚典', '榮慶', '德瑞', '文德', '柏理', '幸生',
    '承啟', '天義', '佳瑄', '韋淳', '杏輝', '健喬信元', '意欣', '生達', '台田', '晟德大',
    '泰裕', '亞太', '健鴻', '鎰浩', '怡美', '美立恒', '大帝', '發礮成', '回春堂', '立統行',
    '永豐', '展億', '天行', '正和', '美迪華', '元宙', '北進', '長捷', '友利行', '舜興',
    '安堤', '惠德勝', '華安', '蒼達', '泰宗', '維星', '萬宇康', '新瑞真富', '溫士頓', '昇銘',
    '亞博', '永信', '冠均', '華德', '健亞', '野義', '培力', '喜美德', '睿昶', '信東',
    '渥克', '科懋', '人人', '山水', '宏曜', '吉興', '凱基', '華基', '宏達', '西達',
    '友華', '友霖', '惠貿', '天穎', '瑪裏士', '百達',
  ];

  const filteredVendors = React.useMemo(() => {
    if (!vendorInput.trim()) return VENDOR_LIST;
    const term = vendorInput.toLowerCase();
    return VENDOR_LIST.filter(v => v.toLowerCase().includes(term));
  }, [vendorInput]);

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
      return new Map();
    }

    try {
      const response = await getStock({
        ServerName: selectedWarehouse.name,
        ServerType: selectedWarehouse.type
      });

      setAllStockItems(response.Data || []);

      const stockMap = new Map<string, number>();
      response.Data.forEach((item: StockItem) => {
        let totalQty = 0;
        if (Array.isArray(item.qty)) {
          totalQty = item.qty.reduce((sum, q) => sum + parseFloat(q || '0'), 0);
        } else {
          totalQty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty || '0');
        }
        stockMap.set(item.code, totalQty);
      });

      setStockData(stockMap);
      return stockMap;
    } catch (error) {
      console.error('Failed to fetch source stock:', error);
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
            minProcurementQuantity: 1,
            smallestUnitConversionRate: 1,
            smallestUnitName: '',
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
              minProcurementQuantity: 1,
              smallestUnitConversionRate: 1,
              smallestUnitName: '',
            };
          }

          const procurementUnit = units.find(u => u.unit_type === '採購');

          if (!procurementUnit) {
            const fallbackUnit = units[units.length - 1]?.unit_name || '';
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
              minProcurementQuantity: 1,
              smallestUnitConversionRate: 1,
              smallestUnitName: fallbackUnit,
            };
          }

          const smallestUnit = units.reduce((max, unit) => {
            const currentOrder = parseInt(unit.sort_order);
            const maxOrder = parseInt(max.sort_order);
            return currentOrder > maxOrder ? unit : max;
          }, units[0]);

          const smallestUnitConversionRate = parseFloat(smallestUnit.conversion_rate) || 1;
          const smallestUnitName = smallestUnit.unit_name;
          const adjustedQuantity = Math.ceil(rawQuantity / smallestUnitConversionRate) * smallestUnitConversionRate;

          const procurementUnitName = procurementUnit.unit_name;
          const minProcurementQuantity = parseFloat(procurementUnit.quantity) || 1;

          const requiredProcurementUnits = Math.ceil(adjustedQuantity / smallestUnitConversionRate);
          const finalProcurementUnits = Math.max(requiredProcurementUnits, minProcurementQuantity);

          return {
            code: item.code,
            itemCode: item.material_no,
            name: item.name,
            rawQuantity,
            adjustedQuantity,
            convertedUnit: `${finalProcurementUnits} ${procurementUnitName}`,
            conversionRate: smallestUnitConversionRate,
            displayUnitName: procurementUnitName,
            originalItem: item,
            sourceStock: null,
            minProcurementQuantity,
            smallestUnitConversionRate,
            smallestUnitName,
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
            minProcurementQuantity: 1,
            smallestUnitConversionRate: 1,
            smallestUnitName: '',
          };
        }
      });

      const results = await Promise.all(previewPromises);
      const freshStockData = await fetchSourceStock();

      const resultsWithStock = results.map(preview => ({
        ...preview,
        sourceStock: freshStockData.get(preview.code) ?? null
      }));

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

  const handleRawQuantityChange = (code: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const preview = previews.find(p => p.code === code);
    if (!preview) return;

    const adjustedQuantity = Math.ceil(numValue / preview.smallestUnitConversionRate) * preview.smallestUnitConversionRate;
    const requiredProcurementUnits = Math.ceil(adjustedQuantity / preview.conversionRate);
    const finalProcurementUnits = Math.max(requiredProcurementUnits, preview.minProcurementQuantity);

    setEditedQuantities(prev => {
      const newMap = new Map(prev);
      newMap.set(code, { raw: numValue, converted: finalProcurementUnits });
      return newMap;
    });
  };

  const handleConvertedQuantityChange = (code: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const preview = previews.find(p => p.code === code);
    if (!preview) return;

    const finalProcurementUnits = Math.max(numValue, preview.minProcurementQuantity);
    const adjustedQuantity = finalProcurementUnits * preview.conversionRate;

    setEditedQuantities(prev => {
      const newMap = new Map(prev);
      newMap.set(code, { raw: adjustedQuantity, converted: finalProcurementUnits });
      return newMap;
    });
  };

  const getDisplayQuantities = (preview: ProcurementPreview) => {
    const edited = editedQuantities.get(preview.code);
    if (edited) {
      let adjustedQuantity: number;

      if (edited.raw === 0 || edited.raw < preview.smallestUnitConversionRate) {
        adjustedQuantity = edited.converted * preview.conversionRate;
      } else {
        adjustedQuantity = Math.ceil(edited.raw / preview.smallestUnitConversionRate) * preview.smallestUnitConversionRate;
      }

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

      let newPreview: ProcurementPreview;

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
          minProcurementQuantity: 1,
          smallestUnitConversionRate: 1,
          smallestUnitName: '',
        };
      } else {
        const procurementUnit = units.find(u => u.unit_type === '採購');

        if (!procurementUnit) {
          const fallbackUnit = units[units.length - 1]?.unit_name || '';
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
            minProcurementQuantity: 1,
            smallestUnitConversionRate: 1,
            smallestUnitName: fallbackUnit,
          };
        } else {
          const smallestUnit = units.reduce((max, unit) => {
            const currentOrder = parseInt(unit.sort_order);
            const maxOrder = parseInt(max.sort_order);
            return currentOrder > maxOrder ? unit : max;
          }, units[0]);

          const smallestUnitConversionRate = parseFloat(smallestUnit.conversion_rate) || 1;
          const smallestUnitName = smallestUnit.unit_name;
          const procurementUnitName = procurementUnit.unit_name;
          const minProcurementQuantity = parseFloat(procurementUnit.quantity) || 1;

          newPreview = {
            code: drugItem.code,
            itemCode: drugItem.material_no,
            name: drugItem.name,
            rawQuantity: 0,
            adjustedQuantity: 0,
            convertedUnit: `0 ${procurementUnitName}`,
            conversionRate: smallestUnitConversionRate,
            displayUnitName: procurementUnitName,
            originalItem: replenishmentItem,
            sourceStock: stockData.get(drugItem.code) ?? null,
            minProcurementQuantity,
            smallestUnitConversionRate,
            smallestUnitName,
          };
        }
      }

      setPreviews(prev => [...prev, newPreview]);
      setEditedQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(drugItem.code, { raw: 0, converted: newPreview.minProcurementQuantity });
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

    const requestData = {
      Data: previews.map(preview => {
        const quantities = getDisplayQuantities(preview);

        return {
          CODE: preview.code,
          NAME: preview.name,
          SKDIACODE: preview.itemCode,
          START_QTY: String(quantities.convertedCount)
        };
      })
    };

    try {
      setIsLoading(true);
      const response = await apiCall('/api/inspection/download_purchaseExcel', {
        method: 'POST',
        body: requestData,
        responseType: 'blob'
      });

      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const filename = `${destinationServerName}-${dateStr}-建議採購.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('採購單已下載', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to download procurement excel:', error);
      showToast('採購單下載失敗', 'error');
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
                <h2 className="text-xl font-bold text-slate-800">建立採購單預覽</h2>
                <p className="text-sm text-slate-600">共 {items.length} 項需採購藥品</p>
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
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="輸入廠商..."
                    value={vendorInput}
                    onChange={(e) => {
                      setVendorInput(e.target.value);
                      setShowVendorDropdown(true);
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowVendorDropdown(false), 150)}
                    className="w-44 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                  {showVendorDropdown && filteredVendors.length > 0 && (
                    <div className="absolute z-10 top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {filteredVendors.map((vendor) => (
                        <div
                          key={vendor}
                          onMouseDown={() => {
                            setVendorInput(vendor);
                            setShowVendorDropdown(false);
                          }}
                          className="px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                        >
                          {vendor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus size={18} />
                  新增藥品
                </button>
              </div>
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
              <p className="text-slate-500">無需採購的藥品</p>
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
                      採購數量
                    </th>
                    <th className="px-4 py-3 text-center text-base font-semibold text-slate-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {previews.map((preview, index) => {
                    const quantities = getDisplayQuantities(preview);
                    const isLessThanMin = quantities.convertedCount < preview.minProcurementQuantity;
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
                          <div className="flex items-center justify-end gap-1">
                            <span className={quantities.adjustedQuantity !== quantities.rawQuantity ? 'font-semibold text-orange-600' : 'text-slate-600'}>
                            {quantities.adjustedQuantity}
                          </span>
                           
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min={preview.minProcurementQuantity}
                              step="1"
                              value={quantities.convertedCount}
                              onChange={(e) => handleConvertedQuantityChange(preview.code, e.target.value)}
                              className={`w-24 px-2 py-1 text-right border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold ${
                                isLessThanMin ? 'border-red-500 text-red-600' : 'border-slate-300 text-blue-600'
                              }`}
                              title={`最低採購數量：${preview.minProcurementQuantity}`}
                            />
                            {preview.displayUnitName && (
                              <span className="text-slate-600 font-medium">{preview.displayUnitName}</span>
                            )}
                          </div>
                          {isLessThanMin && (
                            <div className="text-xs text-red-500 mt-1 text-right">
                              最低：{preview.minProcurementQuantity}
                            </div>
                          )}
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
