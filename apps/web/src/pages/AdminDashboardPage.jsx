import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBytes } from '../lib/crypto';
import {
  HardDrive,
  Send,
  Download,
  Clock,
  Trash2,
  RefreshCw,
  LogOut,
  AlertTriangle,
  FolderInput,
  ShieldCheck,
  Activity,
  Layers,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('sendora_admin_token');

  const [stats, setStats] = useState(null);
  const [transfersData, setTransfersData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manual cleanup state
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  const fetchDashboardData = () => {
    if (!token) {
      navigate('/admin/login');
      return;
    }

    setLoading(true);
    Promise.all([
      api.adminGetStats(token),
      api.adminGetTransfers(page, token)
    ])
      .then(([statsRes, transfersRes]) => {
        setStats(statsRes);
        setTransfersData(transfersRes);
        setLoading(false);
      })
      .catch((err) => {
        if (err.status === 401) {
          sessionStorage.removeItem('sendora_admin_token');
          navigate('/admin/login');
        } else {
          setError(err.message);
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [page]);

  const handleRunCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);
    try {
      const res = await api.adminRunCleanup(token);
      setCleanupResult(res.summary);
      // Refresh stats
      fetchDashboardData();
    } catch (err) {
      alert(`Cleanup error: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout(token);
    } catch (e) {}
    sessionStorage.removeItem('sendora_admin_token');
    sessionStorage.removeItem('sendora_admin_user');
    navigate('/admin/login');
  };

  if (loading && !stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-mono text-sendora-500">Querying platform telemetry & D1 analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-sendora-900 dark:text-white">Admin Dashboard Error</h2>
        <p className="text-xs text-sendora-500">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, charts, recent_activity } = stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sendora-200 dark:border-sendora-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-sendora-500">
              Cloudflare Operations • Live Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
            Sendora Administration
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-sendora-200 dark:border-sendora-700 text-sendora-600 dark:text-sendora-300 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={cleaning}
            onClick={handleRunCleanup}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sendora-100 dark:bg-sendora-800 hover:bg-sendora-200 dark:hover:bg-sendora-700 text-xs font-semibold text-sendora-800 dark:text-sendora-200 transition-colors disabled:opacity-50"
          >
            {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-accent" />}
            Trigger Expiry Cleanup
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sendora-200 dark:border-sendora-700 text-xs font-semibold text-sendora-700 dark:text-sendora-300 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {cleanupResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            Cleanup complete: {cleanupResult.deletedTransfers} expired transfers and {cleanupResult.deletedFiles} storage files purged.
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Storage Meter */}
        <div className="p-5 rounded-3xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-sendora-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              R2 Storage Used
            </span>
            <HardDrive className="w-4 h-4 text-accent" />
          </div>
          <div>
            <span className="text-2xl font-bold text-sendora-900 dark:text-white">
              {formatBytes(metrics.storage_used_bytes)}
            </span>
            <span className="text-xs font-mono text-sendora-400 ml-1.5">
              ({metrics.storage_percentage}% of 10 GB Free Tier)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-sendora-100 dark:bg-sendora-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                metrics.storage_percentage > 80 ? 'bg-red-500' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(100, metrics.storage_percentage)}%` }}
            />
          </div>
        </div>

        {/* Transfers Active */}
        <div className="p-5 rounded-3xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-sendora-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              Transfers
            </span>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-sendora-900 dark:text-white">
              {metrics.active_transfers}
            </span>
            <span className="text-xs text-sendora-400 ml-1.5">active</span>
          </div>
          <p className="text-[11px] font-mono text-sendora-400">
            {metrics.total_transfers} all-time • {metrics.expired_transfers} expired
          </p>
        </div>

        {/* Downloads */}
        <div className="p-5 rounded-3xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-sendora-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              Downloads
            </span>
            <Download className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-sendora-900 dark:text-white">
              {metrics.total_downloads}
            </span>
            <span className="text-xs text-sendora-400 ml-1.5">completed</span>
          </div>
          <p className="text-[11px] font-mono text-sendora-400">
            {metrics.total_files} active files stored
          </p>
        </div>

        {/* Requests */}
        <div className="p-5 rounded-3xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-sendora-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              File Drop Submissions
            </span>
            <FolderInput className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-sendora-900 dark:text-white">
              {metrics.total_submissions}
            </span>
            <span className="text-xs text-sendora-400 ml-1.5">received</span>
          </div>
          <p className="text-[11px] font-mono text-sendora-400">
            Across {metrics.total_requests} active drops
          </p>
        </div>
      </div>

      {/* Visual Activity & Transfer Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Uploads / Downloads Trend Card */}
        <div className="lg:col-span-8 bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-sendora-700 dark:text-sendora-300">
                Daily Activity (Past 7 Days)
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {charts.daily_uploads.length === 0 ? (
              <p className="text-xs font-mono text-sendora-400 py-6 text-center">
                No transfer volume recorded in the last 7 days.
              </p>
            ) : (
              <div className="space-y-3">
                {charts.daily_uploads.map((dayItem) => (
                  <div key={dayItem.day} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono text-sendora-500">
                      <span>{dayItem.day}</span>
                      <span className="text-sendora-800 dark:text-sendora-200 font-bold">
                        {dayItem.count} transfers
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-sendora-100 dark:bg-sendora-800 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(10, dayItem.count * 10))}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transfer Types Breakdown */}
        <div className="lg:col-span-4 bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-sendora-700 dark:text-sendora-300">
              Payload Types
            </h3>
          </div>

          <div className="space-y-3">
            {charts.transfer_types.map((type) => (
              <div
                key={type.transfer_type}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-100 dark:border-sendora-800 text-xs"
              >
                <span className="font-semibold text-sendora-900 dark:text-white capitalize">
                  {type.transfer_type} Transfers
                </span>
                <span className="font-mono font-bold text-accent">
                  {type.count}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-sendora-50 dark:bg-sendora-800/20 border border-sendora-200/60 dark:border-sendora-800 text-[11px] font-mono text-sendora-500 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-500 inline mr-1" />
            All uploads run directly to S3-compatible R2 storage without Worker CPU saturation.
          </div>
        </div>
      </div>

      {/* Recent Audit Log Feed */}
      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-sendora-700 dark:text-sendora-300">
          Security & Operations Audit Trail
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-sendora-100 dark:border-sendora-800 text-sendora-400 uppercase text-[10px]">
              <tr>
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Event</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sendora-100 dark:divide-sendora-800 text-sendora-700 dark:text-sendora-300">
              {recent_activity.map((log) => (
                <tr key={log.id} className="hover:bg-sendora-50/50 dark:hover:bg-sendora-800/30">
                  <td className="py-2.5 text-sendora-400">
                    {new Date(log.created_at * 1000).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 font-semibold text-sendora-900 dark:text-white">
                    {log.event_type}
                  </td>
                  <td className="py-2.5 text-sendora-500">
                    {log.actor_type}:{log.actor_id || 'sys'}
                  </td>
                  <td className="py-2.5 text-sendora-500 truncate max-w-xs">
                    {log.metadata_json}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
