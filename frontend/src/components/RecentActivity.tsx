import { formatCurrency } from '../utils/format';
import type { Project, Transaction } from '../types';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface RecentActivityProps {
  projects: Project[];
  onManageTransactions: (project: Project) => void;
}

interface FlattenedTransaction extends Transaction {
  projectName: string;
  projectClient: string;
  projectType: string;
  projectObj: Project;
}

export const RecentActivity = ({ projects, onManageTransactions }: RecentActivityProps) => {
  // Extract all transactions from all projects and attach project details
  const allTransactions: FlattenedTransaction[] = projects.reduce((acc: FlattenedTransaction[], project) => {
    if (!project.transactions) return acc;
    const txs = project.transactions.map(tx => ({
      ...tx,
      projectName: project.name,
      projectClient: project.client,
      projectType: project.type,
      projectObj: project
    }));
    return [...acc, ...txs];
  }, []);

  // Sort by transaction date descending, then limit to 8
  const recentTransactions = allTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col bg-white/[0.01]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Recent Activity
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Latest financial transactions</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/5 rounded-2xl">
            <p className="text-xs text-zinc-500 italic">No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentTransactions.map((tx) => {
              const isPaid = tx.type === 'Paid';
              const displayName = tx.projectType === 'College' ? `${tx.projectClient} (College)` : tx.projectName;

              return (
                <div
                  key={tx.id}
                  onClick={() => onManageTransactions(tx.projectObj)}
                  className="flex items-center justify-between py-3.5 hover:bg-white/[0.02] -mx-4 px-4 rounded-xl cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl border shrink-0 ${
                      isPaid 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {isPaid ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-100 text-sm truncate group-hover:text-indigo-300 transition-colors">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5 flex items-center gap-1.5">
                        <span>{formatDate(tx.date)}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="italic max-w-[120px] truncate">"{tx.notes}"</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isPaid ? '+' : '-'} {formatCurrency(tx.amount)}
                    </p>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                      {tx.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
