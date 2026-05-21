import React from 'react';
import { X, Server } from 'lucide-react';
import { ServerInventoryDetail } from '../../types/inventory';

interface ServerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  drugName: string;
  drugCode: string;
  servers: ServerInventoryDetail[];
}

export const ServerDetailModal: React.FC<ServerDetailModalProps> = ({
  isOpen,
  onClose,
  drugName,
  drugCode,
  servers,
}) => {
  if (!isOpen) return null;

  const warehouseServers = servers.filter(s => s.server_type === '藥庫');
  const pharmacyServers = servers.filter(s => s.server_type !== '藥庫');

  const getStockStatus = (stock: number, safety: number) => {
    if (stock < safety) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Server size={20} className="text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">伺服器詳細資料</h2>
                <p className="text-sm text-slate-600">
                  <span className="font-mono font-medium">{drugCode}</span> - {drugName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {warehouseServers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">藥庫</h3>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">伺服器名稱</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">庫存</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">安全量</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">基準量</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">批號</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">效期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {warehouseServers.map((server, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                          {server.server_name}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center font-semibold ${getStockStatus(server.stock, server.safety)}`}>
                          {server.stock.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">
                          {server.safety.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">
                          {server.standard.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {server.lots.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {server.lots.map((lot, i) => (
                                <span key={i} className="text-xs">{lot} ({server.quantities[i] || 0})</span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {server.expiry_dates.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {server.expiry_dates.map((date, i) => (
                                <span key={i} className="text-xs">{date}</span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-slate-800">總計</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">
                        {warehouseServers.reduce((sum, s) => sum + s.stock, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">
                        {warehouseServers.reduce((sum, s) => sum + s.safety, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">
                        {warehouseServers.reduce((sum, s) => sum + s.standard, 0).toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pharmacyServers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4">藥局</h3>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">伺服器名稱</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">庫存</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">安全量</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">基準量</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">批號</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">效期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pharmacyServers.map((server, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                          {server.server_name}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center font-semibold ${getStockStatus(server.stock, server.safety)}`}>
                          {server.stock.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">
                          {server.safety.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">
                          {server.standard.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {server.lots.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {server.lots.map((lot, i) => (
                                <span key={i} className="text-xs">{lot} ({server.quantities[i] || 0})</span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {server.expiry_dates.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {server.expiry_dates.map((date, i) => (
                                <span key={i} className="text-xs">{date}</span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-slate-800">總計</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">
                        {pharmacyServers.reduce((sum, s) => sum + s.stock, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">
                        {pharmacyServers.reduce((sum, s) => sum + s.safety, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">
                        {pharmacyServers.reduce((sum, s) => sum + s.standard, 0).toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {servers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">無伺服器資料</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
