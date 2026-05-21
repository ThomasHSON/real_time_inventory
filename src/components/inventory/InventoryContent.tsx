import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, Filter } from 'lucide-react';
import { InventoryItem, ServerInventoryDetail } from '../../types/inventory';
import { ContextMenu } from './ContextMenu';
import { UnitDetailsModal } from './UnitDetailsModal';
import { ServerDetailModal } from './ServerDetailModal';
import { getUnitsByMedGuid, updateUnits } from '../../services/unitService';
import { UnitDetail } from '../../types/unit';
import { getInventoryData } from '../../services/inventoryService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useToast } from '../common/ToastContainer';

type SortField = 'code' | 'material_no' | 'name' | 'type' | 'unit' | 'verified_qty' | 'transit_qty' | 'warehouse_stock' | 'warehouse_safety' | 'warehouse_standard' | 'pharmacy_stock' | 'pharmacy_safety' | 'pharmacy_standard';
type SortDirection = 'asc' | 'desc' | null;

export const InventoryContent: React.FC = () => {
  const { showToast } = useToast();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['all']));
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'normal'>('all');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: InventoryItem } | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showServerDetailModal, setShowServerDetailModal] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setIsLoading(true);
      const data = await getInventoryData();
      setInventoryData(data);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      showToast('載入庫存資料失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowServerDetailModal(true);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleViewUnitDetails = () => {
    if (contextMenu?.item) {
      setSelectedItem(contextMenu.item);
      setShowUnitModal(true);
      setContextMenu(null);
    }
  };

  const handleCloseUnitModal = () => {
    setShowUnitModal(false);
    setSelectedItem(null);
  };

  const types = useMemo(() => {
    const uniqueTypes = Array.from(new Set(inventoryData.map(item => item.type).filter(t => t)));
    return uniqueTypes.sort();
  }, [inventoryData]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
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
    const filtered = inventoryData.filter(item => {
      const matchesSearch =
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cht_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material_no.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedTypes.has('all') || selectedTypes.has(item.type);

      const matchesStockFilter = (() => {
        if (stockFilter === 'all') return true;

        const hasLowStock = item.servers.some(server => server.stock < server.safety);

        if (stockFilter === 'low') {
          return hasLowStock;
        }

        return !hasLowStock;
      })();

      return matchesSearch && matchesType && matchesStockFilter;
    });

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        const warehouseServersA = a.servers.filter(s => s.server_type === '藥庫');
        const pharmacyServersA = a.servers.filter(s => s.server_type !== '藥庫');
        const warehouseServersB = b.servers.filter(s => s.server_type === '藥庫');
        const pharmacyServersB = b.servers.filter(s => s.server_type !== '藥庫');

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
          case 'unit':
            aValue = a.unit;
            bValue = b.unit;
            break;
          case 'verified_qty':
            aValue = a.verified_qty;
            bValue = b.verified_qty;
            break;
          case 'transit_qty':
            aValue = a.transit_qty;
            bValue = b.transit_qty;
            break;
          case 'warehouse_stock':
            aValue = warehouseServersA.reduce((sum, s) => sum + s.stock, 0);
            bValue = warehouseServersB.reduce((sum, s) => sum + s.stock, 0);
            break;
          case 'warehouse_safety':
            aValue = warehouseServersA.reduce((sum, s) => sum + s.safety, 0);
            bValue = warehouseServersB.reduce((sum, s) => sum + s.safety, 0);
            break;
          case 'warehouse_standard':
            aValue = warehouseServersA.reduce((sum, s) => sum + s.standard, 0);
            bValue = warehouseServersB.reduce((sum, s) => sum + s.standard, 0);
            break;
          case 'pharmacy_stock':
            aValue = pharmacyServersA.reduce((sum, s) => sum + s.stock, 0);
            bValue = pharmacyServersB.reduce((sum, s) => sum + s.stock, 0);
            break;
          case 'pharmacy_safety':
            aValue = pharmacyServersA.reduce((sum, s) => sum + s.safety, 0);
            bValue = pharmacyServersB.reduce((sum, s) => sum + s.safety, 0);
            break;
          case 'pharmacy_standard':
            aValue = pharmacyServersA.reduce((sum, s) => sum + s.standard, 0);
            bValue = pharmacyServersB.reduce((sum, s) => sum + s.standard, 0);
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

      return filtered;
    }

    return filtered.sort((a, b) => {
      const getLatestOpTime = (item: InventoryItem): Date | null => {
        let latestTime: Date | null = null;
        item.servers.forEach(server => {
          server.full_data.content.forEach(content => {
            content.Sub_content.forEach(sub => {
              if (sub.OP_TIME) {
                const time = new Date(sub.OP_TIME);
                if (!latestTime || time > latestTime) {
                  latestTime = time;
                }
              }
            });
          });
        });
        return latestTime;
      };

      const getEarliestDeliveryTime = (item: InventoryItem): Date | null => {
        let earliestTime: Date | null = null;
        item.servers.forEach(server => {
          server.full_data.content.forEach(content => {
            if (content.DELIVERY_TIME) {
              const time = new Date(content.DELIVERY_TIME);
              if (!earliestTime || time < earliestTime) {
                earliestTime = time;
              }
            }
          });
        });
        return earliestTime;
      };

      const hasLowStock = (item: InventoryItem): boolean => {
        return item.servers.some(server => server.stock < server.safety);
      };

      const aVerified = a.verified_qty;
      const bVerified = b.verified_qty;
      const aTransit = a.transit_qty;
      const bTransit = b.transit_qty;

      const aIsVerified = aVerified !== 0;
      const bIsVerified = bVerified !== 0;
      const aIsTransit = aVerified === 0 && aTransit !== 0;
      const bIsTransit = bVerified === 0 && bTransit !== 0;
      const aIsLowStock = !aIsVerified && !aIsTransit && hasLowStock(a);
      const bIsLowStock = !bIsVerified && !bIsTransit && hasLowStock(b);

      if (aIsVerified && !bIsVerified) return -1;
      if (!aIsVerified && bIsVerified) return 1;

      if (aIsVerified && bIsVerified) {
        const aTime = getLatestOpTime(a);
        const bTime = getLatestOpTime(b);
        if (aTime && bTime) {
          return bTime.getTime() - aTime.getTime();
        }
        if (aTime) return -1;
        if (bTime) return 1;
        return 0;
      }

      if (aIsTransit && !bIsTransit) return -1;
      if (!aIsTransit && bIsTransit) return 1;

      if (aIsTransit && bIsTransit) {
        const aTime = getEarliestDeliveryTime(a);
        const bTime = getEarliestDeliveryTime(b);
        if (aTime && bTime) {
          return aTime.getTime() - bTime.getTime();
        }
        if (aTime) return -1;
        if (bTime) return 1;
        return 0;
      }

      if (aIsLowStock && !bIsLowStock) return -1;
      if (!aIsLowStock && bIsLowStock) return 1;

      if (aIsLowStock && bIsLowStock) {
        return a.code.localeCompare(b.code);
      }

      return a.code.localeCompare(b.code);
    });
  }, [inventoryData, searchTerm, selectedTypes, stockFilter, sortField, sortDirection]);

  const getStockStatus = (stock: number, safety: number) => {
    if (stock < safety) {
      return { color: 'text-red-600', bgColor: 'bg-red-50', label: '低於安全量' };
    }
    return { color: 'text-green-600', bgColor: 'bg-green-50', label: '正常' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋藥碼、料號、藥名或中文名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'normal')}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="all">全部狀態</option>
              <option value="low">低於安全量</option>
              <option value="normal">庫存正常</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-700">藥品類別:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTypeToggle('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedTypes.has('all')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                全部類別
              </button>
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedTypes.has(type)
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

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th onClick={() => handleSort('code')} className="sticky top-0 px-6 py-4 text-left text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">藥碼</th>
                <th onClick={() => handleSort('material_no')} className="sticky top-0 px-6 py-4 text-left text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">料號</th>
                <th onClick={() => handleSort('name')} className="sticky top-0 px-6 py-4 text-left text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">藥名</th>

                <th onClick={() => handleSort('type')} className="sticky top-0 px-6 py-4 text-left text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">種類</th>
                <th onClick={() => handleSort('unit')} className="sticky top-0 px-6 py-4 text-center text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">單位</th>
                <th onClick={() => handleSort('verified_qty')} className="sticky top-0 px-6 py-4 text-center text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">已驗量</th>
                <th onClick={() => handleSort('transit_qty')} className="sticky top-0 px-6 py-4 text-center text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">在途量</th>
                <th className="sticky top-0 px-6 py-4 text-center text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10" colSpan={3}>藥庫</th>
                <th className="sticky top-0 px-6 py-4 text-center text-base font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 z-10" colSpan={3}>藥局</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th colSpan={7} className="sticky top-[56px] bg-slate-50 z-10"></th>
                <th onClick={() => handleSort('warehouse_stock')} className="sticky top-[56px] px-3 py-2 text-center text-base font-medium text-slate-600 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">庫存</th>
                <th onClick={() => handleSort('warehouse_safety')} className="sticky top-[56px] px-3 py-2 text-center text-base font-medium text-slate-600 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">安全量</th>
                <th onClick={() => handleSort('warehouse_standard')} className="sticky top-[56px] px-3 py-2 text-center text-base font-medium text-slate-600 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">基準量</th>
                <th onClick={() => handleSort('pharmacy_stock')} className="sticky top-[56px] px-3 py-2 text-center text-base font-medium text-slate-600 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">庫存</th>
                <th onClick={() => handleSort('pharmacy_safety')} className="sticky top-[56px] px-3 py-2 text-center text-base font-medium text-slate-600 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">安全量</th>
                <th onClick={() => handleSort('pharmacy_standard')} className="sticky top-[56px] px-3 py-2 text-center text-base font-medium text-slate-600 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100">基準量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((item: InventoryItem) => {
                const warehouseServers = item.servers.filter(s => s.server_type === '藥庫');
                const pharmacyServers = item.servers.filter(s => s.server_type !== '藥庫');

                const warehouseStock = warehouseServers.reduce((sum, s) => sum + s.stock, 0);
                const warehouseSafety = warehouseServers.reduce((sum, s) => sum + s.safety, 0);
                const warehouseStandard = warehouseServers.reduce((sum, s) => sum + s.standard, 0);

                const pharmacyStock = pharmacyServers.reduce((sum, s) => sum + s.stock, 0);
                const pharmacySafety = pharmacyServers.reduce((sum, s) => sum + s.safety, 0);
                const pharmacyStandard = pharmacyServers.reduce((sum, s) => sum + s.standard, 0);

                const warehouseStatus = getStockStatus(warehouseStock, warehouseSafety);
                const pharmacyStatus = getStockStatus(pharmacyStock, pharmacySafety);

                return (
                  <tr
                    key={item.code}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <td className="px-6 py-4 text-sm">
                        {item.code}
                    </td>
                    <td className="px-6 py-4 text-sm">
                        {item.material_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                      <div>{item.name}</div>
                      <div>{item.cht_name}</div>
                    </td>
                   
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {item.type || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-slate-700">{item.unit}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-slate-900">{item.verified_qty.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-amber-600">{item.transit_qty.toLocaleString()}</td>
                    <td className={`px-3 py-4 text-sm text-center font-semibold ${warehouseStatus.color}`}>
                      {warehouseServers.length > 0 ? warehouseStock.toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-center text-slate-600">
                      {warehouseServers.length > 0 ? warehouseSafety.toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-center text-slate-600">
                      {warehouseServers.length > 0 ? warehouseStandard.toLocaleString() : '-'}
                    </td>
                    <td className={`px-3 py-4 text-sm text-center font-semibold ${pharmacyStatus.color}`}>
                      {pharmacyServers.length > 0 ? pharmacyStock.toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-center text-slate-600">
                      {pharmacyServers.length > 0 ? pharmacySafety.toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-center text-slate-600">
                      {pharmacyServers.length > 0 ? pharmacyStandard.toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">找不到符合條件的藥品</p>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-slate-500">
        共顯示 {filteredData.length} 筆資料
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onViewUnitDetails={handleViewUnitDetails}
        />
      )}

      {showUnitModal && selectedItem && selectedItem.servers.length > 0 && (
        <UnitDetailsModal
          isOpen={showUnitModal}
          onClose={handleCloseUnitModal}
          medGuid={selectedItem.servers[0].full_data.med_cloud.GUID}
          medName={selectedItem.name}
          onFetchUnitDetails={getUnitsByMedGuid}
          onUpdateUnits={updateUnits}
        />
      )}

      {showServerDetailModal && selectedItem && (
        <ServerDetailModal
          isOpen={showServerDetailModal}
          onClose={() => setShowServerDetailModal(false)}
          drugName={selectedItem.name}
          drugCode={selectedItem.code}
          servers={selectedItem.servers}
        />
      )}
    </>
  );
};
