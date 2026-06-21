import { useState } from 'react';
import type { Project } from '../types';
import { formatCurrency, cn } from '../utils/format';
import { ChevronDown, ChevronUp, Search, Plus, CreditCard, Filter, User } from 'lucide-react';

interface ProjectsTableProps {
  projects: Project[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  filterType: string;
  setFilterType: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterYear: string;
  setFilterYear: (s: string) => void;
  availableYears: string[];
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onManageTransactions: (project: Project) => void;
}

const getProjectDateStatusBadge = (project: Project) => {
  if (project.status === 'Completed') {
    return <span className="text-[10px] text-zinc-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">Completed</span>;
  }
  if (project.status === 'Failed') {
    return <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Failed</span>;
  }
  if (project.status === 'Ongoing' || !project.endDate) {
    return <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">Ongoing</span>;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(project.endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">Overdue {Math.abs(diffDays)}d</span>;
  } else if (diffDays === 0) {
    return <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded animate-pulse">Ends today</span>;
  } else if (diffDays <= 7) {
    return <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">{diffDays}d left</span>;
  } else {
    const weeks = Math.round(diffDays / 7);
    return <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">{weeks}w left</span>;
  }
};

export const ProjectsTable = ({ 
  projects, 
  searchTerm, 
  setSearchTerm, 
  filterType, 
  setFilterType, 
  filterStatus, 
  setFilterStatus,
  filterYear,
  setFilterYear,
  availableYears,
  onAddProject, 
  onEditProject, 
  onManageTransactions 
}: ProjectsTableProps) => {
  const [sortField, setSortField] = useState<keyof Project>('period');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Project) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'High Pending': return 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]';
      case 'Ongoing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Freelance': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'Internship': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'College': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  };

  const filteredAndSortedProjects = [...projects]
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totals = filteredAndSortedProjects.reduce(
    (acc, project) => {
      const isFailed = project.status === 'Failed';
      return {
        total: acc.total + project.totalAmount,
        received: acc.received + project.receivedAmount,
        pending: acc.pending + (isFailed ? 0 : project.pendingAmount),
      };
    },
    { total: 0, received: 0, pending: 0 }
  );

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full border border-white/5">
      <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">Project Matrix</h2>
            <p className="text-xs text-zinc-500 mt-1">Manage and track project lifecycle</p>
          </div>
          <button
            onClick={onAddProject}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Initialize Project</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search project or client..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-36">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <select 
                className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm appearance-none bg-zinc-900 cursor-pointer text-white"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option className="bg-zinc-900" value="All">All Types</option>
                <option className="bg-zinc-900" value="Freelance">Freelance</option>
                <option className="bg-zinc-900" value="Internship">Internship</option>
                <option className="bg-zinc-900" value="College">College</option>
              </select>
            </div>
            
            <div className="relative flex-1 lg:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <select 
                className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm appearance-none bg-zinc-900 cursor-pointer text-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option className="bg-zinc-900" value="All">All Status</option>
                <option className="bg-zinc-900" value="Completed">Completed</option>
                <option className="bg-zinc-900" value="Pending">Pending</option>
                <option className="bg-zinc-900" value="High Pending">High Pending</option>
                <option className="bg-zinc-900" value="Ongoing">Ongoing</option>
                <option className="bg-zinc-900" value="Failed">Failed</option>
              </select>
            </div>
            
            <div className="relative flex-1 lg:w-32">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <select 
                className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm appearance-none bg-zinc-900 cursor-pointer text-white"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option className="bg-zinc-900" value="All">All Years</option>
                {availableYears.map(year => (
                  <option key={year} className="bg-zinc-900" value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filtered Totals Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10">
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total Value</p>
            <p className="text-sm sm:text-lg font-bold text-white leading-tight">{formatCurrency(totals.total)}</p>
          </div>
          <div className="flex flex-col gap-0.5 border-x border-white/5 px-3 sm:px-4">
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Paid Amount</p>
            <p className="text-sm sm:text-lg font-bold text-emerald-400 leading-tight">{formatCurrency(totals.received)}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Pending Due</p>
            <p className="text-sm sm:text-lg font-black text-rose-400 leading-tight">{formatCurrency(totals.pending)}</p>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-white/[0.03] text-zinc-400 border-b border-white/5">
              {[
                { key: 'name', label: 'Project details' },
                { key: 'totalAmount', label: 'Financials' },
                { key: 'status', label: 'Status' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="px-6 py-4 font-semibold cursor-pointer hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort(key as keyof Project)}
                >
                  <div className="flex items-center gap-2">
                    {label}
                    {sortField === key && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedProjects.map((project) => (
              <tr
                key={project.id}
                className={cn(
                  "hover:bg-indigo-500/[0.03] transition-colors group cursor-pointer",
                  project.status === 'High Pending' ? "bg-rose-500/[0.02]" : ""
                )}
                onClick={() => onEditProject(project)}
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-bold text-zinc-100 text-base leading-none">
                      {project.type === 'College' ? project.client : project.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", getTypeColor(project.type))}>
                        {project.type}
                      </span>
                      <span className="text-xs text-zinc-500">• {project.period}</span>
                      {getProjectDateStatusBadge(project)}
                    </div>
                    {project.type !== 'College' && <span className="text-xs text-zinc-400">{project.client}</span>}
                    {project.notes && (
                      <p className="text-xs text-zinc-500 truncate max-w-[280px] mt-1 italic">"{project.notes}"</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <div className="flex justify-between w-32">
                      <span className="text-zinc-500 text-[11px] uppercase font-bold">Total</span>
                      <span className="font-bold text-zinc-100">{formatCurrency(project.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between w-32">
                      <span className="text-zinc-500 text-[11px] uppercase font-bold">Paid</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(project.receivedAmount)}</span>
                    </div>
                    <div className="flex justify-between w-32 pt-1 border-t border-white/5">
                      <span className="text-zinc-500 text-[11px] uppercase font-bold">
                        {project.status === 'Failed' ? 'Failed' : 'Due'}
                      </span>
                      <span className={cn("font-black", project.status === 'Failed' ? "text-red-400" : "text-rose-400")}>
                        {formatCurrency(project.pendingAmount)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap flex items-center justify-center min-w-[100px]", getStatusColor(project.status))}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onManageTransactions(project); }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Payments
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {filteredAndSortedProjects.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 bg-white/5 rounded-2xl border border-dashed border-white/10 italic">
            No projects found matching criteria
          </div>
        ) : (
          filteredAndSortedProjects.map((project) => (
            <div 
              key={project.id}
              onClick={() => onEditProject(project)}
              className={cn(
                "p-4 rounded-2xl border bg-white/[0.03] transition-all active:scale-[0.98]",
                project.status === 'High Pending' ? "border-rose-500/30 bg-rose-500/[0.03]" : "border-white/5"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-white text-lg truncate">
                    {project.type === 'College' ? project.client : project.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border", getTypeColor(project.type))}>
                      {project.type}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium truncate">{project.period}</span>
                    {getProjectDateStatusBadge(project)}
                  </div>
                </div>
                <span className={cn("px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border whitespace-nowrap", getStatusColor(project.status))}>
                  {project.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 my-3">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Total</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(project.totalAmount)}</p>
                </div>
                <div className="text-center border-x border-white/5">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Paid</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(project.receivedAmount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">
                    {project.status === 'Failed' ? 'Failed' : 'Due'}
                  </p>
                  <p className={cn("text-sm font-black", project.status === 'Failed' ? "text-red-400" : "text-rose-400")}>
                    {formatCurrency(project.pendingAmount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate font-medium">{project.client}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onManageTransactions(project); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"
                >
                  <CreditCard className="w-3 h-3" />
                  Payments
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
