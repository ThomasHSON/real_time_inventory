import React, { useState } from 'react';
import { LogOut, Layers } from 'lucide-react';
import { getConfig } from '../config';
import { InventoryContent } from '../components/inventory/InventoryContent';
import { ClassificationEditPage } from './ClassificationEditPage';
import { ReplenishmentPage } from './ReplenishmentPage';
import { ProcurementPage } from './ProcurementPage';

interface InventoryPageProps {
  onLogout?: () => void;
}

type TabType = 'inventory' | 'classification' | 'replenishment' | 'procurement';

export const InventoryPage: React.FC<InventoryPageProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  const loggedName = sessionStorage.getItem('loggedName') || '';
  const loggedEmployer = sessionStorage.getItem('loggedEmployer') || '';
  const userInfo = loggedName && loggedEmployer ? `${loggedName}-${loggedEmployer}` : '';

  const handleLogout = () => {
    sessionStorage.removeItem('user_session');
    sessionStorage.removeItem('loggedName');
    sessionStorage.removeItem('loggedEmployer');
    if (onLogout) {
      onLogout();
    }
  };

  const handleIconClick = () => {
    const config = getConfig();
    if (config?.domain) {
      window.location.href = config.domain;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full p-4">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleIconClick}
              className="flex items-center justify-center w-12 h-12 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Layers size={24} className="text-slate-700" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">即時庫存查詢系統</h1>
              <p className="text-slate-600">{userInfo || '即時監控藥局與藥庫的庫存狀況'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut size={18} />
            <span>登出</span>
          </button>
        </div>

        <div className="mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'inventory'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                即時庫存
              </button>
              <button
                onClick={() => setActiveTab('classification')}
                className={`py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'classification'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                分類編輯
              </button>
              <button
                onClick={() => setActiveTab('replenishment')}
                className={`py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'replenishment'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                建議撥補
              </button>
              <button
                onClick={() => setActiveTab('procurement')}
                className={`py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'procurement'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                建議採購
              </button>
            </nav>
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'inventory' && <InventoryContent />}
          {activeTab === 'classification' && <ClassificationEditPage />}
          {activeTab === 'replenishment' && <ReplenishmentPage />}
          {activeTab === 'procurement' && <ProcurementPage />}
        </div>
      </div>
    </div>
  );
};
