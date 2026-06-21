import { useState, useEffect } from 'react';
import type { Project } from '../types';
import { formatCurrency, cn } from '../utils/format';
import { AlertTriangle, Clock, Briefcase, IndianRupee, CreditCard, X, Search, Filter, Pencil, XCircle } from 'lucide-react';

interface ProjectListModalProps {
  type: 'workValue' | 'received' | 'pending' | 'projects' | 'failed';
  projects: Project[];
  onClose: () => void;
  onManageTransactions: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export const ProjectListModal = ({ type, projects, onClose, onManageTransactions, onEdit }: ProjectListModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortOption, setSortOption] = useState('default');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  let baseProjects = [...projects];
  let title = '';
  let icon = null;
  let headerColor = '';
  let valueColor = '';
  let emptyMessage = '';
  
  if (type === 'pending') {
    baseProjects = [...projects].filter(p => p.pendingAmount > 0 && p.status !== 'Failed');
    title = 'Pending Dues';
    icon = <AlertTriangle className="w-6 h-6 text-rose-400" />;
    headerColor = 'bg-rose-500/10 border-rose-500/20';
    valueColor = 'text-rose-400';
    emptyMessage = 'All Cleared! No pending payments.';
  } else if (type === 'failed') {
    baseProjects = [...projects].filter(p => p.status === 'Failed');
    title = 'Failed Payments (Bad Debt)';
    icon = <XCircle className="w-6 h-6 text-red-400" />;
    headerColor = 'bg-red-500/10 border-red-500/20';
    valueColor = 'text-red-400';
    emptyMessage = 'No failed payments.';
  } else if (type === 'received') {
    baseProjects = [...projects].filter(p => p.receivedAmount > 0);
    title = 'Received Payments';
    icon = <IndianRupee className="w-6 h-6 text-emerald-400" />;
    headerColor = 'bg-emerald-500/10 border-emerald-500/20';
    valueColor = 'text-emerald-400';
    emptyMessage = 'No payments received yet.';
  } else if (type === 'workValue' || type === 'projects') {
    title = type === 'workValue' ? 'Total Work Value' : 'All Projects';
    icon = type === 'workValue' ? <Briefcase className="w-6 h-6 text-indigo-400" /> : <CreditCard className="w-6 h-6 text-purple-400" />;
    headerColor = type === 'workValue' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-purple-500/10 border-purple-500/20';
    valueColor = type === 'workValue' ? 'text-indigo-400' : 'text-purple-400';
    emptyMessage = 'No projects available.';
  }

  const filteredProjects = baseProjects
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || p.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortOption === 'amount-desc') {
        if (type === 'pending' || type === 'failed') return b.pendingAmount - a.pendingAmount;
        if (type === 'received') return b.receivedAmount - a.receivedAmount;
        return b.totalAmount - a.totalAmount;
      }
      if (sortOption === 'amount-asc') {
        if (type === 'pending' || type === 'failed') return a.pendingAmount - b.pendingAmount;
        if (type === 'received') return a.receivedAmount - b.receivedAmount;
        return a.totalAmount - b.totalAmount;
      }
      if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
      
      // Default sort behavior
      if (type === 'pending' || type === 'failed') return b.pendingAmount - a.pendingAmount;
      if (type === 'received') return b.receivedAmount - a.receivedAmount;
      return b.totalAmount - a.totalAmount;
    });

  const totals = filteredProjects.reduce(
    (acc, project) => ({
      total: acc.total + project.totalAmount,
      received: acc.received + project.receivedAmount,
      pending: acc.pending + project.pendingAmount,
    }),
    { total: 0, received: 0, pending: 0 }
  );

  const headerTotal = type === 'pending' ? totals.pending : type === 'received' ? totals.received : totals.total;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-card rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(79,70,229,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col h-[94vh] sm:h-auto sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={cn("p-2 sm:p-3 rounded-xl border", headerColor)}>
              {icon}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">{title}</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-zinc-500 mb-0.5 sm:mb-1">
                {type === 'pending' ? 'Total Due' : type === 'received' ? 'Total Received' : 'Total Value'}
              </p>
              <p className={cn("text-lg sm:text-2xl font-bold leading-none", valueColor)}>
                {formatCurrency(headerTotal)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-36">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <select 
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-sm appearance-none bg-zinc-900 cursor-pointer text-white"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option className="bg-zinc-900 text-white" value="All">All Types</option>
              <option className="bg-zinc-900 text-white" value="Freelance">Freelance</option>
              <option className="bg-zinc-900 text-white" value="Internship">Internship</option>
              <option className="bg-zinc-900 text-white" value="College">College</option>
            </select>
          </div>
          <div className="relative w-full sm:w-40">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <select 
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-sm appearance-none bg-zinc-900 cursor-pointer text-white"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option className="bg-zinc-900 text-white" value="default">Sort by Default</option>
              <option className="bg-zinc-900 text-white" value="amount-desc">Amount (Highest)</option>
              <option className="bg-zinc-900 text-white" value="amount-asc">Amount (Lowest)</option>
              <option className="bg-zinc-900 text-white" value="name-asc">Name (A-Z)</option>
              <option className="bg-zinc-900 text-white" value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
        
        {/* Filtered Totals Summary */}
        <div className="px-4 py-3 border-b border-white/5 bg-indigo-500/[0.03] grid grid-cols-3 gap-3 shrink-0">
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Total Value</p>
            <p className="text-sm font-bold text-white leading-tight">{formatCurrency(totals.total)}</p>
          </div>
          <div className="flex flex-col gap-0.5 border-x border-white/5 px-3">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Paid Amount</p>
            <p className="text-sm font-bold text-emerald-400 leading-tight">{formatCurrency(totals.received)}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Pending Due</p>
            <p className="text-sm font-black text-rose-400 leading-tight">{formatCurrency(totals.pending)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-3 sm:p-4 custom-scrollbar flex-1 pb-10 sm:pb-4">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", headerColor)}>
                <Clock className={cn("w-8 h-8", valueColor)} />
              </div>
              <p className="font-semibold text-white text-lg">
                {baseProjects.length === 0 ? emptyMessage : 'No projects match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const isHigh = project.status === 'High Pending';
                const pct = Math.round((project.receivedAmount / project.totalAmount) * 100);
                
                let displayAmount = project.totalAmount;
                let displayLabel = 'Total';
                if (type === 'pending') {
                  displayAmount = project.pendingAmount;
                  displayLabel = 'Pending';
                } else if (type === 'received') {
                  displayAmount = project.receivedAmount;
                  displayLabel = 'Received';
                }

                return (
                  <div
                    key={project.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-all duration-200 cursor-pointer group",
                      isHigh && type === 'pending' ? "bg-rose-500/5" : "bg-zinc-900/50"
                    )}
                    onClick={() => {
                      onClose();
                      onManageTransactions(project);
                    }}
                  >
                    {/* Status dot */}
                    <div className={cn(
                      "w-3 h-3 rounded-full shrink-0",
                      isHigh && type === 'pending' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" : 
                      project.status === 'Completed' ? "bg-emerald-400" :
                      project.status === 'Ongoing' ? "bg-blue-400" : "bg-amber-400"
                    )} />

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-100 truncate text-lg">
                        {project.type === 'College' ? project.client : project.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                          project.type === 'Freelance' ? "bg-purple-500/10 text-purple-400" :
                          project.type === 'Internship' ? "bg-indigo-500/10 text-indigo-400" :
                          "bg-orange-500/10 text-orange-400"
                        )}>{project.type}</span>
                        {project.type !== 'College' && (
                          <span className="text-sm text-zinc-500 truncate">{project.client}</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="hidden md:flex flex-col gap-1.5 w-32 shrink-0">
                      <div className="flex justify-between text-xs text-zinc-500 font-medium">
                        <span className="text-emerald-500/80">{pct}% paid</span>
                        <span className="text-rose-500/80">{100 - pct}% due</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Amount + Edit */}
                    <div className="text-right shrink-0 min-w-[100px] flex flex-col items-end gap-2">
                      <p className={cn("font-bold text-lg", valueColor)}>
                        {formatCurrency(displayAmount)}
                      </p>
                      <p className="text-xs text-zinc-500">{displayLabel} of {formatCurrency(project.totalAmount)}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onEdit(project);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-300 transition-all duration-200 text-xs font-medium"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
