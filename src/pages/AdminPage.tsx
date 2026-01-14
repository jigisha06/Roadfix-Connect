import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, RefreshCw, CheckCircle, Users, AlertTriangle, Clock, X, LogOut, TrendingUp, Target, Zap, ThumbsUp } from 'lucide-react';
import { supabase, Report, StatusHistory } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [metrics, setMetrics] = useState({
    total: 0,
    resolved: 0,
    avgResolutionTime: 0,
    highPriority: 0,
    crowdVerified: 0
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        if (a.escalated !== b.escalated) {
          return a.escalated ? -1 : 1;
        }
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });

      setReports(sortedData);
      calculateMetrics(sortedData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const runEscalation = async () => {
    try {
      const { error } = await supabase.rpc('escalate_old_pending_reports');
      if (error) throw error;
      fetchReports();
      alert('Escalation check completed. Old pending reports have been escalated.');
    } catch (error) {
      console.error('Error running escalation:', error);
      alert('Failed to run escalation');
    }
  };

  const calculateMetrics = async (reportsData: Report[]) => {
    const total = reportsData.length;
    const resolved = reportsData.filter(r => r.status === 'Resolved').length;
    const highPriority = reportsData.filter(r => r.priority === 'High').length;
    const crowdVerified = reportsData.filter(r => r.crowd_verified).length;

    let avgResolutionTime = 0;
    const resolvedReports = reportsData.filter(r => r.status === 'Resolved');

    if (resolvedReports.length > 0) {
      let totalResolutionTime = 0;

      for (const report of resolvedReports) {
        const { data: history } = await supabase
          .from('status_history')
          .select('changed_at')
          .eq('report_id', report.id)
          .order('changed_at', { ascending: true });

        if (history && history.length >= 2) {
          const createdAt = new Date(history[0].changed_at).getTime();
          const resolvedAt = new Date(history[history.length - 1].changed_at).getTime();
          totalResolutionTime += (resolvedAt - createdAt) / (1000 * 60 * 60);
        }
      }

      avgResolutionTime = totalResolutionTime / resolvedReports.length;
    }

    setMetrics({
      total,
      resolved,
      avgResolutionTime,
      highPriority,
      crowdVerified
    });
  };

  const fetchStatusHistory = async (reportId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('report_id', reportId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateStatus = async (id: string, newStatus: Report['status']) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setReports(reports.map(report =>
        report.id === id ? { ...report, status: newStatus } : report
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const openTimeline = (report: Report) => {
    setSelectedReport(report);
    fetchStatusHistory(report.id);
  };

  const closeTimeline = () => {
    setSelectedReport(null);
    setStatusHistory([]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityReason = (report: Report) => {
    const totalReports = report.nearby_reports_count + 1;
    const totalSignals = totalReports + report.confirmation_count;

    if (report.priority === 'High') {
      return `High activity: ${totalReports} nearby reports, ${report.confirmation_count} confirmations (${totalSignals} total signals)`;
    } else if (report.priority === 'Medium') {
      return `Moderate activity: ${totalReports} nearby reports, ${report.confirmation_count} confirmations (${totalSignals} total signals)`;
    } else {
      return `Low activity: ${totalReports} nearby report(s), ${report.confirmation_count} confirmation(s)`;
    }
  };

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter(report => report.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Manage road issue reports with smart insights</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={runEscalation}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Zap size={18} />
                Run Escalation
              </button>
              <button
                onClick={fetchReports}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Issues</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.total}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Target size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Issues</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.resolved}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0}% completion
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.avgResolutionTime > 0 ? metrics.avgResolutionTime.toFixed(1) : '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">hours</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Clock size={24} className="text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.highPriority}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.crowdVerified} crowd verified
                </p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-medium text-gray-700">Filter by status:</span>
            <div className="flex gap-2">
              {['all', 'Pending', 'In Progress', 'Resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">No reports found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-gray-100 relative">
                  <img
                    src={report.image_url}
                    alt={report.issue_type}
                    className="w-full h-full object-cover"
                  />
                  {report.escalated && (
                    <div className="absolute top-2 left-2 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                      <Zap size={12} />
                      ESCALATED
                    </div>
                  )}
                  {report.nearby_reports_count > 0 && !report.escalated && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Users size={12} />
                      Duplicate Area
                    </div>
                  )}
                  {report.priority === 'High' && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <AlertTriangle size={12} />
                      High Priority
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.issue_type}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        report.status
                      )}`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {report.ai_verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                          <CheckCircle size={12} />
                          AI Verified
                        </span>
                      )}
                      {report.crowd_verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                          <Users size={12} />
                          Crowd Verified ({report.nearby_reports_count + 1})
                        </span>
                      )}
                      {report.confirmation_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                          <ThumbsUp size={12} />
                          {report.confirmation_count} Confirmations
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(report.priority)}`}>
                        {report.priority} Priority
                      </span>
                      {report.escalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
                          <Zap size={12} />
                          Escalated (7+ days)
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Priority Reason:</span> {getPriorityReason(report)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin size={16} className="flex-shrink-0" />
                    <span className="truncate">
                      {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                    </span>
                  </div>

                  <button
                    onClick={() => openTimeline(report)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                  >
                    <Clock size={16} />
                    View Timeline
                  </button>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Update Status
                    </label>
                    <select
                      value={report.status}
                      onChange={(e) => updateStatus(report.id, e.target.value as Report['status'])}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Status Timeline</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedReport.issue_type}</p>
              </div>
              <button
                onClick={closeTimeline}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : statusHistory.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No status changes yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="relative flex gap-4">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                          history.new_status === 'Resolved' ? 'bg-green-500' :
                          history.new_status === 'In Progress' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`}>
                          {index === 0 ? (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(history.new_status)}`}>
                                {history.new_status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(history.changed_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {history.old_status && (
                              <p className="text-sm text-gray-600">
                                Changed from <span className="font-medium">{history.old_status}</span> to <span className="font-medium">{history.new_status}</span>
                              </p>
                            )}
                            {!history.old_status && (
                              <p className="text-sm text-gray-600">
                                Report created with status <span className="font-medium">{history.new_status}</span>
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">By: {history.changed_by}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Priority:</span>
                  <span className={`ml-2 font-medium ${
                    selectedReport.priority === 'High' ? 'text-red-600' :
                    selectedReport.priority === 'Medium' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>{selectedReport.priority}</span>
                </div>
                <div>
                  <span className="text-gray-600">Nearby Reports:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedReport.nearby_reports_count}</span>
                </div>
                <div>
                  <span className="text-gray-600">Crowd Verified:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedReport.crowd_verified ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-gray-600">AI Verified:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedReport.ai_verified ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
