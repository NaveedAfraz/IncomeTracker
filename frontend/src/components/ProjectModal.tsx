import { useState, useEffect } from 'react';
import type { Project, ProjectType } from '../types';
import { X, Trash2 } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id' | 'pendingAmount' | 'status' | 'transactions'> & { statusOverride?: string }) => void;
  onDelete?: (id: string) => void;
  project?: Project;
}

export const ProjectModal = ({ isOpen, onClose, onSave, onDelete, project }: ProjectModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    type: 'Freelance' as ProjectType,
    startDate: '',
    endDate: '',
    isOngoing: true,
    totalAmount: '',
    receivedAmount: '',
    notes: '',
    statusOverride: 'auto'
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (project) {
      // Convert stored DATE (YYYY-MM-DD) to YYYY-MM for month input
      const toMonthVal = (d: string | null | undefined) => {
        if (!d) return '';
        return String(d).substring(0, 7); // "YYYY-MM"
      };
      setFormData({
        name: project.name,
        client: project.client,
        type: project.type,
        startDate: toMonthVal(project.startDate),
        endDate: toMonthVal(project.endDate),
        isOngoing: !project.endDate,
        totalAmount: project.totalAmount.toString(),
        receivedAmount: project.receivedAmount.toString(),
        notes: project.notes || '',
        statusOverride: project.status || 'auto'
      });
    } else {
      setFormData({
        name: '',
        client: '',
        type: 'Freelance',
        startDate: '',
        endDate: '',
        isOngoing: true,
        totalAmount: '',
        receivedAmount: '0',
        notes: '',
        statusOverride: 'auto'
      });
    }
  }, [project, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const total = parseFloat(formData.totalAmount) || 0;
  const received = parseFloat(formData.receivedAmount) || 0;
  const pending = total - received;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.client || !formData.totalAmount) return;

    // Convert YYYY-MM to YYYY-MM-01 for backend DATE column
    const toDateStr = (m: string) => m ? `${m}-01` : null;

    let finalOverride = formData.statusOverride;
    if (finalOverride === 'Completed' && pending > 0) {
      finalOverride = 'auto';
    }

    onSave({
      name: formData.name,
      client: formData.client,
      type: formData.type,
      period: '', // backend generates this from startDate/endDate
      startDate: toDateStr(formData.startDate),
      endDate: formData.isOngoing ? null : toDateStr(formData.endDate),
      totalAmount: total,
      receivedAmount: received,
      notes: formData.notes,
      ...(finalOverride !== 'auto' && { statusOverride: finalOverride })
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-card rounded-2xl w-full max-w-xl shadow-[0_0_50px_rgba(79,70,229,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col h-[94vh] sm:h-auto sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-bold text-white">
            {project ? 'Edit Project' : 'New Project Initiation'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Project Name <span className="text-rose-500">*</span></label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 rounded-xl glass-input"
                placeholder="e.g. Website Redesign"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Client Name <span className="text-rose-500">*</span></label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 rounded-xl glass-input"
                placeholder="e.g. Acme Corp"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Type</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl glass-input appearance-none bg-zinc-900"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectType })}
              >
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
                <option value="College">College</option>
              </select>
            </div>

            {/* Timeline row: Start Date | Status Override */}
            <div className="col-span-2 grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Start Date <span className="text-rose-500">*</span></label>
                <input
                  required
                  type="month"
                  className="w-full px-4 py-2.5 rounded-xl glass-input appearance-none bg-zinc-900 text-white [color-scheme:dark]"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Status Override</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl glass-input appearance-none bg-zinc-900"
                  value={formData.statusOverride}
                  onChange={(e) => setFormData({ ...formData, statusOverride: e.target.value })}
                >
                  <option value="auto">Auto (by amounts)</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Pending">Pending</option>
                  <option value="High Pending">High Pending</option>
                  <option value="Completed" disabled={pending > 0}>
                    Completed {pending > 0 ? '(Needs full payment)' : ''}
                  </option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            {/* End Date row with Ongoing toggle */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-zinc-300">End Date</label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-zinc-400">Ongoing</span>
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                      formData.isOngoing ? 'bg-indigo-600' : 'bg-zinc-700'
                    }`}
                    onClick={() => setFormData({ ...formData, isOngoing: !formData.isOngoing })}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      formData.isOngoing ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </label>
              </div>
              {formData.isOngoing ? (
                <div className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-zinc-500 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  Present / Ongoing
                </div>
              ) : (
                <input
                  type="month"
                  className="w-full px-4 py-2.5 rounded-xl glass-input appearance-none bg-zinc-900 text-white [color-scheme:dark]"
                  value={formData.endDate}
                  min={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              )}
            </div>

            <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Total Value <span className="text-rose-500">*</span></label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 rounded-lg glass-input font-medium"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Received</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 rounded-lg glass-input text-emerald-400 font-medium"
                  value={formData.receivedAmount}
                  onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Pending (Auto)</label>
                <div className={`w-full px-3 py-2 bg-black/20 border border-black/50 rounded-lg font-medium flex items-center h-[38px] ${pending > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {pending >= 0 ? pending : 0}
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
              <textarea
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl glass-input resize-none"
                placeholder="Any additional context..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-white/10 gap-3">
            {project && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(project.id)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-xl transition-all duration-300"
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] rounded-xl transition-all duration-300"
              >
                {project ? 'Save Changes' : 'Launch Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
