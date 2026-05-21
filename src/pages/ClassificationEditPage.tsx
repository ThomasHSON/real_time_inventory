import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertCircle, Plus, Edit2, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getServerSettings, getStock, createClassify, updateClassify, updateDrugClassify, getAllClassifications, deleteClassify } from '../services/stockService';
import { ServerSetting } from '../types/serverSetting';
import { StockItem, Classify } from '../types/stock';
import LoadingSpinner from '../components/common/LoadingSpinner';

export const ClassificationEditPage: React.FC = () => {
  const [servers, setServers] = useState<ServerSetting[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerSetting | null>(null);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [allClassifications, setAllClassifications] = useState<Classify[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedDrugType, setSelectedDrugType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClassify, setEditingClassify] = useState<Classify | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDrugType, setBatchDrugType] = useState<string>('');
  const [showUnclassifiedBatchModal, setShowUnclassifiedBatchModal] = useState(false);
  const [unclassifiedGroupItems, setUnclassifiedGroupItems] = useState<StockItem[]>([]);
  const [showEditClassifyModal, setShowEditClassifyModal] = useState(false);
  const [editingClassifyForManage, setEditingClassifyForManage] = useState<Classify | null>(null);

  useEffect(() => {
    fetchServerSettings();
    fetchAllClassifications();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchStockData(selectedServer);
    }
  }, [selectedServer]);

  const fetchAllClassifications = async () => {
    try {
      const response = await getAllClassifications();
      if (response.Code === 200 && response.Data) {
        setAllClassifications(response.Data);
      }
    } catch (err) {
      console.error('Failed to fetch classifications:', err);
    }
  };

  const fetchServerSettings = async () => {
    try {
      setIsLoading(true);
      const response = await getServerSettings();

      if (response.Code === 200 && response.Data) {
        const sortedServers = [...response.Data].sort((a, b) => {
          if (a.type === '藥庫' && b.type !== '藥庫') return -1;
          if (a.type !== '藥庫' && b.type === '藥庫') return 1;
          return 0;
        });

        setServers(sortedServers);

        if (sortedServers.length > 0) {
          setSelectedServer(sortedServers[0]);
        }
      } else {
        setError(response.Result || '無法取得伺服器設定');
      }
    } catch (err) {
      console.error('Failed to fetch server settings:', err);
      setError('載入伺服器設定時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockData = async (server: ServerSetting) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getStock({
        ServerName: server.name,
        ServerType: server.type,
      });

      if (response.Code === 200 && response.Data) {
        setStockData(response.Data);
      } else {
        setError(response.Result || '無法取得庫存資料');
        setStockData([]);
      }
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
      setError('載入庫存資料時發生錯誤');
      setStockData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const drugTypes = useMemo(() => {
    const types = new Set<string>();
    stockData.forEach(item => {
      if (item.med_cloud?.TYPE) {
        types.add(item.med_cloud.TYPE);
      }
    });
    return Array.from(types).sort();
  }, [stockData]);

  const filteredStockData = useMemo(() => {
    if (selectedDrugType === 'all') {
      return stockData;
    }
    return stockData.filter(item => item.med_cloud?.TYPE === selectedDrugType);
  }, [stockData, selectedDrugType]);

  const isValidClassify = (classify: any): classify is Classify => {
    return classify && typeof classify === 'object' && classify.GUID && classify.name;
  };

  const groupedData = useMemo(() => {
    const groups = new Map<string, { classify: Classify | null; items: StockItem[] }>();

    filteredStockData.forEach((item) => {
      const hasValidClassify = item.Classify_GUID && isValidClassify(item.Classify);
      const classifyGuid = hasValidClassify ? item.Classify_GUID : 'unclassified';
      if (!groups.has(classifyGuid)) {
        groups.set(classifyGuid, {
          classify: hasValidClassify ? item.Classify : null,
          items: [],
        });
      }
      groups.get(classifyGuid)!.items.push(item);
    });

    const groupsArray = Array.from(groups.entries()).map(([guid, data]) => ({
      guid,
      ...data,
    }));

    return groupsArray.sort((a, b) => {
      const nameA = a.classify?.name || '未分類';
      const nameB = b.classify?.name || '未分類';
      return nameA.localeCompare(nameB, 'zh-TW');
    });
  }, [filteredStockData]);

  const toggleGroup = (guid: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guid)) {
        newSet.delete(guid);
      } else {
        newSet.add(guid);
      }
      return newSet;
    });
  };

  const handleChangeDrugClassification = async (drugGuid: string, classifyGuid: string) => {
    try {
      console.log('Updating drug classification:', { drugGuid, classifyGuid });

      const response = await updateDrugClassify({
        ServerName: selectedServer?.name || '',
        ServerType: selectedServer?.type || '',
        Data: {
          GUID: drugGuid,
          Classify_GUID: classifyGuid,
        },
      });

      console.log('Update drug classification response:', response);

      if (response.Code === 200) {
        if (selectedServer) {
          await fetchStockData(selectedServer);
        }
        await fetchAllClassifications();
      } else {
        console.error('Update failed with response:', response);
        alert(`更新失敗: ${response.Result || '未知錯誤'}`);
      }
    } catch (err) {
      console.error('Failed to update drug classification - Full error:', err);
      const errorMessage = err instanceof Error ? err.message : '更新藥品分類時發生錯誤';
      alert(`更新失敗: ${errorMessage}`);
    }
  };

  const handleBatchUpdateByType = async (drugType: string, classifyGuid: string) => {
    const drugsToUpdate = stockData.filter(item => item.med_cloud?.TYPE === drugType);

    if (drugsToUpdate.length === 0) {
      alert('沒有找到該類別的藥品');
      return;
    }

    const confirmed = confirm(`確定要將 ${drugsToUpdate.length} 個「${drugType}」類別的藥品統一設定分類嗎？`);
    if (!confirmed) return;

    try {
      const updateItems = drugsToUpdate.map(drug => ({
        GUID: drug.GUID,
        Classify_GUID: classifyGuid,
      }));

      const response = await updateDrugClassify({
        ServerName: selectedServer?.name || '',
        ServerType: selectedServer?.type || '',
        Data: updateItems,
      });

      if (response.Code === 200) {
        alert(`批次更新完成\n成功更新 ${drugsToUpdate.length} 項藥品分類`);

        if (selectedServer) {
          await fetchStockData(selectedServer);
        }
        await fetchAllClassifications();
      } else {
        alert(`批次更新失敗: ${response.Result || '未知錯誤'}`);
      }
    } catch (err) {
      console.error('Batch update error:', err);
      const errorMessage = err instanceof Error ? err.message : '批次更新時發生錯誤';
      alert(`批次更新失敗: ${errorMessage}`);
    }
  };

  if (isLoading && servers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex-1">
            <div className="flex flex-wrap gap-2">
              {servers.map((server) => (
                <button
                  key={`${server.name}-${server.type}`}
                  onClick={() => setSelectedServer(server)}
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

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span>新增分類</span>
            </button>
            <button
              onClick={() => setShowEditClassifyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Edit2 size={18} />
              <span>編輯分類</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-700">藥品類別:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDrugType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDrugType === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                全部類別
              </button>
              {drugTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedDrugType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedDrugType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {selectedDrugType !== 'all' && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    setBatchDrugType(selectedDrugType);
                    setShowBatchModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Edit2 size={18} />
                  <span>批次設定「{selectedDrugType}」分類</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && selectedServer ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : stockData.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">目前沒有庫存資料</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group) => {
            const isExpanded = expandedGroups.has(group.guid);
            return (
              <div
                key={group.guid}
                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleGroup(group.guid)}
                      className="flex items-center gap-4 flex-1 text-left hover:bg-slate-100 -m-4 p-4 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-slate-600" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-600" />
                      )}
                      <h3 className="text-lg font-semibold text-slate-800">
                        {group.classify ? group.classify.name : '未分類'}
                      </h3>
                      <span className="text-sm text-slate-500">
                        ({group.items.length} 項藥品)
                      </span>
                      {group.classify && (
                        <>
                          <div className="flex items-center gap-2 text-sm ml-auto mr-4">
                            <span className="text-slate-600">安全量:</span>
                            <span className="font-semibold text-slate-800">
                              {group.classify.safe_day} 天
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600">基準量:</span>
                            <span className="font-semibold text-slate-800">
                              {group.classify.standard_day} 天
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                    {group.classify ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClassify(group.classify);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors ml-4"
                      >
                        <Edit2 size={14} />
                        <span>編輯</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnclassifiedGroupItems(group.items);
                          setShowUnclassifiedBatchModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors ml-4"
                      >
                        <Edit2 size={14} />
                        <span>批次設定分類</span>
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                            藥碼
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                            藥名
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                            料號
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                            藥品類別
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                            分類
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {group.items.map((item) => (
                          <tr key={item.GUID} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                              {item.code}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">{item.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              {item.material_no || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                {item.med_cloud?.TYPE || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={item.Classify_GUID || ''}
                                onChange={(e) => handleChangeDrugClassification(item.GUID, e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">未分類</option>
                                {allClassifications.map((classify) => (
                                  <option key={classify.GUID} value={classify.GUID}>
                                    {classify.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <ClassifyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchAllClassifications();
            if (selectedServer) fetchStockData(selectedServer);
          }}
        />
      )}

      {showEditModal && editingClassify && (
        <ClassifyModal
          classify={editingClassify}
          onClose={() => {
            setShowEditModal(false);
            setEditingClassify(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingClassify(null);
            fetchAllClassifications();
            if (selectedServer) fetchStockData(selectedServer);
          }}
        />
      )}

      {showBatchModal && (
        <BatchClassifyModal
          drugType={batchDrugType}
          classifications={allClassifications}
          onClose={() => {
            setShowBatchModal(false);
            setBatchDrugType('');
          }}
          onConfirm={(classifyGuid) => {
            handleBatchUpdateByType(batchDrugType, classifyGuid);
            setShowBatchModal(false);
            setBatchDrugType('');
          }}
        />
      )}

      {showUnclassifiedBatchModal && (
        <UnclassifiedBatchModal
          items={unclassifiedGroupItems}
          classifications={allClassifications}
          serverName={selectedServer?.name || ''}
          serverType={selectedServer?.type || ''}
          onClose={() => {
            setShowUnclassifiedBatchModal(false);
            setUnclassifiedGroupItems([]);
          }}
          onSuccess={() => {
            setShowUnclassifiedBatchModal(false);
            setUnclassifiedGroupItems([]);
            fetchAllClassifications();
            if (selectedServer) fetchStockData(selectedServer);
          }}
        />
      )}

      {showEditClassifyModal && (
        <EditClassifyListModal
          classifications={allClassifications}
          onClose={() => {
            setShowEditClassifyModal(false);
            setEditingClassifyForManage(null);
          }}
          onEdit={(classify) => {
            setEditingClassifyForManage(classify);
            setShowEditClassifyModal(false);
            setShowEditModal(true);
          }}
          onDelete={async (classify) => {
            const confirmed = confirm(`確定要刪除分類「${classify.name}」嗎？\n此操作無法復原。`);
            if (!confirmed) return;

            try {
              const response = await deleteClassify({
                Data: {
                  GUID: classify.GUID,
                },
              });

              if (response.Code === 200) {
                alert('分類刪除成功');
                fetchAllClassifications();
                if (selectedServer) fetchStockData(selectedServer);
              } else {
                alert(response.Result || '刪除失敗');
              }
            } catch (err) {
              console.error('Failed to delete classification:', err);
              alert('刪除分類時發生錯誤');
            }
          }}
        />
      )}
    </div>
  );
};

interface ClassifyModalProps {
  classify?: Classify;
  onClose: () => void;
  onSuccess: () => void;
}

const EditClassifyListModal: React.FC<{
  classifications: Classify[];
  onClose: () => void;
  onEdit: (classify: Classify) => void;
  onDelete: (classify: Classify) => void;
}> = ({ classifications, onClose, onEdit, onDelete }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">編輯分類</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {classifications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              目前沒有分類
            </div>
          ) : (
            <div className="space-y-3">
              {classifications.map((classify) => (
                <div
                  key={classify.GUID}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{classify.name}</h4>
                    <div className="flex gap-4 mt-1 text-sm text-slate-600">
                      <span>安全量: {classify.safe_day} 天</span>
                      <span>基準量: {classify.standard_day} 天</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(classify)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <Edit2 size={14} />
                      <span>編輯</span>
                    </button>
                    <button
                      onClick={() => onDelete(classify)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>刪除</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

const ClassifyModal: React.FC<ClassifyModalProps> = ({ classify, onClose, onSuccess }) => {
  const [name, setName] = useState(classify?.name || '');
  const [safeDay, setSafeDay] = useState(classify?.safe_day?.toString() || '');
  const [standardDay, setStandardDay] = useState(classify?.standard_day?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (classify) {
      setName(classify.name || '');
      setSafeDay(classify.safe_day?.toString() || '');
      setStandardDay(classify.standard_day?.toString() || '');
    } else {
      setName('');
      setSafeDay('');
      setStandardDay('');
    }
  }, [classify]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;
      if (classify) {
        response = await updateClassify({
          Data: {
            GUID: classify.GUID,
            name,
            safe_day: safeDay,
            standard_day: standardDay,
          },
        });
      } else {
        response = await createClassify({
          Data: {
            name,
            safe_day: safeDay,
            standard_day: standardDay,
          },
        });
      }

      if (response.Code === 200) {
        onSuccess();
      } else {
        alert(response.Result || '操作失敗');
      }
    } catch (err) {
      console.error('Failed to save classification:', err);
      alert('儲存分類時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {classify ? '編輯分類' : '新增分類'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              分類名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              安全量天數
            </label>
            <input
              type="number"
              value={safeDay}
              onChange={(e) => setSafeDay(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              基準量天數
            </label>
            <input
              type="number"
              value={standardDay}
              onChange={(e) => setStandardDay(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '處理中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BatchClassifyModalProps {
  drugType: string;
  classifications: Classify[];
  onClose: () => void;
  onConfirm: (classifyGuid: string) => void;
}

const BatchClassifyModal: React.FC<BatchClassifyModalProps> = ({ drugType, classifications, onClose, onConfirm }) => {
  const [selectedClassifyGuid, setSelectedClassifyGuid] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassifyGuid) {
      onConfirm(selectedClassifyGuid);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            批次設定「{drugType}」類別分類
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              此操作將會把所有「{drugType}」類別的藥品統一設定為選擇的分類
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              選擇分類
            </label>
            <select
              value={selectedClassifyGuid}
              onChange={(e) => setSelectedClassifyGuid(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">請選擇分類</option>
              {classifications.map((classify) => (
                <option key={classify.GUID} value={classify.GUID}>
                  {classify.name} (安全量: {classify.safe_day}天 / 基準量: {classify.standard_day}天)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              確認批次設定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface UnclassifiedBatchModalProps {
  items: StockItem[];
  classifications: Classify[];
  serverName: string;
  serverType: string;
  onClose: () => void;
  onSuccess: () => void;
}

const UnclassifiedBatchModal: React.FC<UnclassifiedBatchModalProps> = ({
  items,
  classifications,
  serverName,
  serverType,
  onClose,
  onSuccess
}) => {
  const [selectedOption, setSelectedOption] = useState<'existing' | 'new'>('existing');
  const [selectedClassifyGuid, setSelectedClassifyGuid] = useState<string>('');
  const [newClassifyName, setNewClassifyName] = useState<string>('');
  const [newSafeDay, setNewSafeDay] = useState<string>('');
  const [newStandardDay, setNewStandardDay] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let classifyGuid = selectedClassifyGuid;

      if (selectedOption === 'new') {
        const createResponse = await createClassify({
          Data: {
            name: newClassifyName,
            safe_day: newSafeDay,
            standard_day: newStandardDay,
          },
        });

        console.log('Create classification response:', createResponse);

        if (createResponse.Code !== 200) {
          alert(`建立分類失敗: ${createResponse.Result || '未知錯誤'}`);
          setIsSubmitting(false);
          return;
        }

        if (!createResponse.Data || !Array.isArray(createResponse.Data) || createResponse.Data.length === 0 || !createResponse.Data[0].GUID) {
          console.error('Invalid response data:', createResponse);
          alert('建立分類成功但無法取得分類 GUID，請重新整理後手動設定');
          setIsSubmitting(false);
          return;
        }

        classifyGuid = createResponse.Data[0].GUID;
        console.log('New classification GUID:', classifyGuid);
      }

      if (!classifyGuid) {
        alert('請選擇或建立分類');
        setIsSubmitting(false);
        return;
      }

      console.log('Starting batch update with classifyGuid:', classifyGuid);
      console.log('Number of items to update:', items.length);

      const updateItems = items.map(item => ({
        GUID: item.GUID,
        Classify_GUID: classifyGuid,
      }));

      console.log('Update items:', updateItems);

      const updateResponse = await updateDrugClassify({
        ServerName: serverName,
        ServerType: serverType,
        Data: updateItems,
      });

      console.log('Update drug classification response:', updateResponse);

      if (updateResponse.Code === 200) {
        alert(`批次設定完成\n成功設定 ${items.length} 項藥品分類`);
        onSuccess();
      } else {
        alert(`批次設定失敗: ${updateResponse.Result || '未知錯誤'}`);
      }
    } catch (err) {
      console.error('Batch update error:', err);
      const errorMessage = err instanceof Error ? err.message : '批次設定時發生錯誤';
      alert(`批次設定失敗: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-800">
            批次設定未分類藥品
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              此操作將會把 {items.length} 項未分類藥品統一設定分類
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="option"
                value="existing"
                checked={selectedOption === 'existing'}
                onChange={(e) => setSelectedOption(e.target.value as 'existing')}
                className="w-4 h-4"
              />
              <span className="font-medium text-slate-700">選擇現有分類</span>
            </label>

            {selectedOption === 'existing' && (
              <div className="ml-7 space-y-2">
                <select
                  value={selectedClassifyGuid}
                  onChange={(e) => setSelectedClassifyGuid(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={selectedOption === 'existing'}
                >
                  <option value="">請選擇分類</option>
                  {classifications.map((classify) => (
                    <option key={classify.GUID} value={classify.GUID}>
                      {classify.name} (安全量: {classify.safe_day}天 / 基準量: {classify.standard_day}天)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="option"
                value="new"
                checked={selectedOption === 'new'}
                onChange={(e) => setSelectedOption(e.target.value as 'new')}
                className="w-4 h-4"
              />
              <span className="font-medium text-slate-700">建立新分類</span>
            </label>

            {selectedOption === 'new' && (
              <div className="ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    分類名稱
                  </label>
                  <input
                    type="text"
                    value={newClassifyName}
                    onChange={(e) => setNewClassifyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={selectedOption === 'new'}
                    placeholder="請輸入分類名稱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    安全量天數
                  </label>
                  <input
                    type="number"
                    value={newSafeDay}
                    onChange={(e) => setNewSafeDay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={selectedOption === 'new'}
                    min="0"
                    placeholder="請輸入安全量天數"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    基準量天數
                  </label>
                  <input
                    type="number"
                    value={newStandardDay}
                    onChange={(e) => setNewStandardDay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={selectedOption === 'new'}
                    min="0"
                    placeholder="請輸入基準量天數"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '處理中...' : '確認設定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
