import { useState, useEffect } from 'react';
import type { Project, TransactionType } from '../types';
import { useAddTransactionMutation, useDeleteTransactionMutation } from '../store/api';
import { formatCurrency, cn } from '../utils/format';
import { X, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TransactionsModalProps {
  project: Project;
  onClose: () => void;
}

export const TransactionsModal = ({ project, onClose }: TransactionsModalProps) => {
  const [addTransaction, { isLoading: isAddingTx }] = useAddTransactionMutation();
  const [deleteTransaction, { isLoading: isDeletingTx }] = useDeleteTransactionMutation();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'Paid' as TransactionType,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    try {
      await addTransaction({
        projectId: project.id,
        amount: parseFloat(formData.amount),
        type: formData.type,
        date: formData.date,
        notes: formData.notes
      }).unwrap();

      setIsAdding(false);
      setFormData({
        amount: '',
        type: 'Paid',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error('Failed to add transaction', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-card rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(79,70,229,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col h-[94vh] sm:h-auto sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Transaction Ledger</h2>
            <p className="text-xs sm:text-sm text-indigo-300 mt-1">{project.name} • {project.client}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-zinc-200">History</h3>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                New Entry
              </button>
            )}
          </div>

          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-8 p-5 bg-black/20 rounded-xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm rounded-lg glass-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg glass-input bg-zinc-900"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  >
                    <option value="Paid">Received</option>
                    <option value="Due">Due</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="date"
                    className="w-full px-3 py-2 text-sm rounded-lg glass-input [color-scheme:dark]"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-4">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg glass-input"
                    placeholder="Reference # or details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingTx}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAddingTx ? 'Processing...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          )}

          {project.transactions && project.transactions.length > 0 ? (
            <div className="space-y-3">
              {[...project.transactions].reverse().map((t) => (
                <div key={t.id} className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border",
                      t.type === 'Paid' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {t.type === 'Paid' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-lg text-white tracking-tight">{formatCurrency(t.amount)}</span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          t.type === 'Paid' ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        )}>
                          {t.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 flex items-center gap-2">
                        <span>{new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        {t.notes && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                            <span>{t.notes}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTransaction({ id: t.id, projectId: project.id })}
                    disabled={isDeletingTx}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
              <p className="text-zinc-500 font-medium">No transactions recorded yet.</p>
              <p className="text-zinc-600 text-sm mt-1">Click New Entry to add one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
