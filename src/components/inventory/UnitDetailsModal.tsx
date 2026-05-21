import React, { useEffect, useState, useCallback } from 'react';
import { X, Package, Edit2, Plus, Save, Trash2 } from 'lucide-react';
import { UnitDetail } from '../../types/unit';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface UnitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  medGuid: string;
  medName: string;
  onFetchUnitDetails: (medGuid: string) => Promise<UnitDetail[]>;
  onUpdateUnits: (units: UnitDetail[]) => Promise<void>;
}

export const UnitDetailsModal: React.FC<UnitDetailsModalProps> = ({
  isOpen,
  onClose,
  medGuid,
  medName,
  onFetchUnitDetails,
  onUpdateUnits,
}) => {
  const [units, setUnits] = useState<UnitDetail[]>([]);
  const [editedUnits, setEditedUnits] = useState<UnitDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await onFetchUnitDetails(medGuid);
      setUnits(data);
      setEditedUnits(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      setError('無法載入單位詳細資訊');
      console.error('Failed to fetch unit details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [medGuid, onFetchUnitDetails]);

  useEffect(() => {
    if (isOpen && medGuid) {
      fetchUnits();
      setIsEditMode(false);
    }
  }, [isOpen, medGuid, fetchUnits]);

  const handleEdit = () => {
    setIsEditMode(true);
    setEditedUnits(JSON.parse(JSON.stringify(units)));
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedUnits(JSON.parse(JSON.stringify(units)));
  };

  const validateUnits = (): string | null => {
    for (let i = 0; i < editedUnits.length; i++) {
      const unit = editedUnits[i];

      if (!unit.unit_name.trim()) {
        return `單位 ${i + 1}：單位名稱不能為空`;
      }

      if (!unit.quantity || parseInt(unit.quantity) < 1) {
        return `單位 ${i + 1}：最小操作數量必須大於 0`;
      }

      if (!unit.sort_order || parseInt(unit.sort_order) < 1) {
        return `單位 ${i + 1}：順序必須大於 0`;
      }

      const sortOrder = parseInt(unit.sort_order);
      if (sortOrder > 1 && !unit.conversion_rate) {
        return `單位 ${i + 1}：順序大於 1 的單位必須設定換算比例`;
      }

      if (unit.conversion_rate && parseFloat(unit.conversion_rate) <= 0) {
        return `單位 ${i + 1}：換算比例必須大於 0`;
      }
    }

    const sortOrders = editedUnits.map(u => parseInt(u.sort_order));
    const uniqueSortOrders = new Set(sortOrders);
    if (sortOrders.length !== uniqueSortOrders.size) {
      return '順序不能重複';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateUnits();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onUpdateUnits(editedUnits);
      setUnits(JSON.parse(JSON.stringify(editedUnits)));
      setIsEditMode(false);
    } catch (err) {
      setError('儲存失敗，請稍後再試');
      console.error('Failed to save units:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (index: number, field: keyof UnitDetail, value: string) => {
    const newUnits = [...editedUnits];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setEditedUnits(newUnits);
  };

  const handleAddUnit = () => {
    const maxSortOrder = Math.max(...editedUnits.map(u => parseInt(u.sort_order) || 0), 0);
    const newUnit: UnitDetail = {
      GUID: `NEW_${Date.now()}`,
      med_guid: medGuid,
      unit_type: '撥補',
      unit_name: '',
      quantity: '1',
      sort_order: String(maxSortOrder + 1),
      conversion_rate: '',
    };
    setEditedUnits([...editedUnits, newUnit]);
  };

  const handleDeleteUnit = (index: number) => {
    const newUnits = editedUnits.filter((_, i) => i !== index);
    setEditedUnits(newUnits);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">單位詳細資訊</h2>
              <p className="text-sm text-slate-600">{medName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchUnits}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                重試
              </button>
            </div>
          ) : units.length === 0 && !isEditMode ? (
            <div className="text-center py-12 text-slate-500">
              無單位資訊
            </div>
          ) : !isEditMode ? (
            <div className="space-y-3">
              {units.map((unit, index) => (
                <div
                  key={unit.GUID}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-slate-700 text-white text-xs rounded">
                          {unit.unit_type}
                        </span>
                        <span className="text-lg font-semibold text-slate-800">
                          {unit.unit_name}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {unit.conversion_rate && (
                          <p className="text-sm text-slate-600">
                            換算比例：1 {units[index - 1]?.unit_name || '上層單位'} = {unit.conversion_rate} {unit.unit_name}
                          </p>
                        )}
                        {unit.quantity && (
                          <p className="text-sm text-slate-600">
                            最小操作數量：{unit.quantity} {unit.unit_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">
                        順序 {unit.sort_order}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {editedUnits.map((unit, index) => (
                <div
                  key={unit.GUID}
                  className="bg-white rounded-lg p-4 border-2 border-slate-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">單位 {index + 1}</span>
                      {editedUnits.length > 1 && (
                        <button
                          onClick={() => handleDeleteUnit(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="刪除此單位"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          單位類型 *
                        </label>
                        <select
                          value={unit.unit_type}
                          onChange={(e) => handleFieldChange(index, 'unit_type', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="採購">採購</option>
                          <option value="撥補">撥補</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          單位名稱 *
                        </label>
                        <input
                          type="text"
                          value={unit.unit_name}
                          onChange={(e) => handleFieldChange(index, 'unit_name', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="例：盒、瓶"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          最小操作數量 *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={unit.quantity}
                          onChange={(e) => handleFieldChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          順序 *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={unit.sort_order}
                          onChange={(e) => handleFieldChange(index, 'sort_order', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          換算比例 {parseInt(unit.sort_order) > 1 && '*'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={unit.conversion_rate}
                          onChange={(e) => handleFieldChange(index, 'conversion_rate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={parseInt(unit.sort_order) === 1 ? '第一層單位無需填寫' : '與上層單位的換算比例'}
                          disabled={parseInt(unit.sort_order) === 1}
                        />
                        {parseInt(unit.sort_order) > 1 && unit.conversion_rate && (
                          <p className="text-xs text-slate-500 mt-1">
                            1 {editedUnits[index - 1]?.unit_name || '上層單位'} = {unit.conversion_rate} {unit.unit_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddUnit}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span>新增單位</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 p-6 border-t border-slate-200 bg-slate-50">
          {!isEditMode ? (
            <>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center gap-2"
              >
                <Edit2 size={16} />
                <span>編輯</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                關閉
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner />
                    <span>儲存中...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>儲存</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
