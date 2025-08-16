// components/jobs/JobStatusManager.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  X,
  Play,
  Pause,
  Flag,
  RotateCcw,
  Calendar,
  FileText,
  MessageSquare,
  ArrowRight,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    color: 'blue',
    icon: Clock,
    description: 'Job is open for applications'
  },
  in_progress: {
    label: 'In Progress',
    color: 'orange',
    icon: Play,
    description: 'Job is currently being worked on'
  },
  completed: {
    label: 'Completed',
    color: 'green',
    icon: CheckCircle,
    description: 'Job has been completed'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    icon: X,
    description: 'Job was cancelled'
  },
  disputed: {
    label: 'Disputed',
    color: 'yellow',
    icon: AlertTriangle,
    description: 'Job is under dispute'
  },
  expired: {
    label: 'Expired',
    color: 'gray',
    icon: Pause,
    description: 'Job deadline has passed'
  }
};

const ACTION_CONFIG = {
  assign: {
    label: 'Assign to Fixer',
    icon: User,
    color: 'blue',
    newStatus: 'in_progress'
  },
  complete: {
    label: 'Mark as Completed',
    icon: CheckCircle,
    color: 'green',
    newStatus: 'completed'
  },
  cancel: {
    label: 'Cancel Job',
    icon: X,
    color: 'red',
    newStatus: 'cancelled'
  },
  dispute: {
    label: 'Raise Dispute',
    icon: Flag,
    color: 'yellow',
    newStatus: 'disputed'
  },
  reopen: {
    label: 'Reopen Job',
    icon: RotateCcw,
    color: 'blue',
    newStatus: 'open'
  }
};

export default function JobStatusManager({ 
  job, 
  onStatusUpdate, 
  currentUser,
  className = '' 
}) {
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionData, setActionData] = useState({});

  useEffect(() => {
    fetchStatusData();
  }, [job._id]);

  const fetchStatusData = async () => {
    try {
      const response = await fetch(`/api/jobs/${job._id}/status`);
      const data = await response.json();
      
      if (data.success) {
        setStatusData(data);
      }
    } catch (error) {
      console.error('Error fetching status data:', error);
    }
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setActionData({});
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedAction) return;

    setLoading(true);
    try {
      const requestData = {
        newStatus: ACTION_CONFIG[selectedAction.action].newStatus,
        ...actionData
      };

      // Handle specific action data requirements
      if (selectedAction.action === 'assign' && actionData.fixerId) {
        requestData.assignedFixerId = actionData.fixerId;
      }

      const response = await fetch(`/api/jobs/${job._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowActionModal(false);
        setSelectedAction(null);
        onStatusUpdate?.(data.job);
        fetchStatusData();
      } else {
        toast.error(data.message || 'Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Failed to update job status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const config = STATUS_CONFIG[status];
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[config?.color] || colors.gray;
  };

  if (!statusData) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[statusData.status];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Current Status */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStatusColor(statusData.status)}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentStatusConfig.label}
              </h3>
              <p className="text-sm text-gray-600">
                {currentStatusConfig.description}
              </p>
            </div>
          </div>
          
          {statusData.lastStatusUpdate && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Last updated</p>
              <p className="text-sm text-gray-700">
                {new Date(statusData.lastStatusUpdate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Assigned User Info */}
        {statusData.assignedTo && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Assigned to: {statusData.assignedTo.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Available Actions */}
      {statusData.availableActions && statusData.availableActions.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Available Actions</h4>
          <div className="flex flex-wrap gap-2">
            {statusData.availableActions.map((action, index) => {
              const actionConfig = ACTION_CONFIG[action.action];
              const ActionIcon = actionConfig.icon;
              
              return (
                <button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors
                    ${actionConfig.color === 'red' 
                      ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' 
                      : actionConfig.color === 'green'
                      ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                      : actionConfig.color === 'yellow'
                      ? 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                      : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    }`}
                >
                  <ActionIcon className="h-4 w-4" />
                  {actionConfig.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status History */}
      {statusData.statusHistory && statusData.statusHistory.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Status History</h4>
          <div className="space-y-3">
            {statusData.statusHistory.slice(-5).reverse().map((entry, index) => {
              const historyStatusConfig = STATUS_CONFIG[entry.status];
              const HistoryIcon = historyStatusConfig.icon;
              
              return (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${getStatusColor(entry.status)}`}>
                    <HistoryIcon className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Changed to {historyStatusConfig.label}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">
                        {new Date(entry.changedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {entry.reason && (
                      <p className="text-gray-600 mt-1">{entry.reason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {ACTION_CONFIG[selectedAction.action].label}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Action-specific fields */}
                {selectedAction.action === 'assign' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Fixer
                    </label>
                    <select
                      value={actionData.fixerId || ''}
                      onChange={(e) => setActionData({ ...actionData, fixerId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a fixer...</option>
                      {job.applications?.filter(app => app.status === 'pending').map(app => (
                        <option key={app._id} value={app.fixer._id}>
                          {app.fixer.name} - ₹{app.proposedAmount.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(selectedAction.action === 'cancel' || selectedAction.action === 'dispute') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedAction.action === 'cancel' ? 'Cancellation Reason' : 'Dispute Reason'}
                    </label>
                    <textarea
                      value={actionData.reason || actionData.disputeReason || ''}
                      onChange={(e) => setActionData({ 
                        ...actionData, 
                        [selectedAction.action === 'cancel' ? 'reason' : 'disputeReason']: e.target.value 
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Please provide a reason..."
                    />
                  </div>
                )}

                {selectedAction.action === 'complete' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Notes
                    </label>
                    <textarea
                      value={actionData.completionNotes || ''}
                      onChange={(e) => setActionData({ ...actionData, completionNotes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe what was completed..."
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowActionModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeAction}
                    disabled={loading || (selectedAction.requiresData?.length > 0 && !Object.keys(actionData).length)}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                      ${ACTION_CONFIG[selectedAction.action].color === 'red' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : ACTION_CONFIG[selectedAction.action].color === 'green'
                        ? 'bg-green-600 hover:bg-green-700'
                        : ACTION_CONFIG[selectedAction.action].color === 'yellow'
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    {loading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {ACTION_CONFIG[selectedAction.action].label}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}