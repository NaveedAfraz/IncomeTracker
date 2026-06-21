import { useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, 
} from 'recharts';
import type { Project } from '../types';
import { formatCurrency } from '../utils/format';
import { TrendingUp, PieChart as PieIcon, Users, BarChart3, ArrowLeft, Search, Filter, Percent, Coins, CheckCircle2 } from 'lucide-react';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const breakDownEntries = Object.entries(data.breakDown || {}).sort((a: any, b: any) => b[1] - a[1]);
    
    return (
      <div className="bg-zinc-900 border border-white/10 p-3 sm:p-4 rounded-xl shadow-xl text-xs min-w-[200px] space-y-2.5">
        <div>
          <p className="text-zinc-400 font-medium text-[10px] uppercase tracking-wider">{data.name}</p>
          <p className="text-lg font-black text-indigo-400 mt-0.5">{formatCurrency(data.income)}</p>
        </div>
        {breakDownEntries.length > 0 && (
          <div className="border-t border-white/5 pt-2.5 space-y-1.5">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Breakdown</p>
            {breakDownEntries.map(([projName, amount]: any) => (
              <div key={projName} className="flex justify-between items-center gap-3">
                <span className="text-zinc-300 truncate max-w-[140px]">{projName}</span>
                <span className="font-semibold text-zinc-100">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface AnalyticsViewProps {
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
  onBack: () => void;
}

export const AnalyticsView = ({ 
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
  onBack 
}: AnalyticsViewProps) => {
  const typeData = useMemo(() => {
    const data: Record<string, number> = {};
    projects.forEach(p => {
      data[p.type] = (data[p.type] || 0) + p.totalAmount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const statusData = useMemo(() => {
    const data: Record<string, number> = {};
    projects.forEach(p => {
      data[p.status] = (data[p.status] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const clientData = useMemo(() => {
    const data: Record<string, number> = {};
    projects.forEach(p => {
      data[p.client] = (data[p.client] || 0) + p.totalAmount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [projects]);

  const timelineData = useMemo(() => {
    const data: Record<string, { total: number; breakDown: Record<string, number> }> = {};
    const monthsSet = new Set<string>();
    
    projects.forEach(p => {
      p.transactions.forEach(t => {
        if (t.type === 'Paid') {
          const date = new Date(t.date);
          // Respect year filter — only include transactions from the selected year
          if (filterYear !== 'All' && date.getFullYear().toString() !== filterYear) return;
          const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          if (!data[yearMonth]) {
            data[yearMonth] = { total: 0, breakDown: {} };
          }
          
          data[yearMonth].total += t.amount;
          const nameToUse = p.type === 'College' ? `${p.client} (College)` : p.name;
          data[yearMonth].breakDown[nameToUse] = (data[yearMonth].breakDown[nameToUse] || 0) + t.amount;
          
          monthsSet.add(yearMonth);
        }
      });
    });
    
    // Sort all unique year-months chronologically
    const sortedMonths = Array.from(monthsSet).sort();
    
    // If we have data, ensure we show a continuous range
    if (sortedMonths.length > 0) {
      const first = sortedMonths[0];
      const last = sortedMonths[sortedMonths.length - 1];
      const start = new Date(first + '-01');
      const end = new Date(last + '-01');
      
      const continuousData = [];
      let current = new Date(start);
      
      while (current <= end) {
        const ym = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
        const label = `${current.toLocaleString('default', { month: 'short' })} ${current.getFullYear().toString().slice(-2)}`;
        continuousData.push({
          name: label,
          income: data[ym]?.total || 0,
          breakDown: data[ym]?.breakDown || {}
        });
        current.setMonth(current.getMonth() + 1);
      }
      return continuousData;
    }
    
    return [];
  }, [projects, filterYear]);

  const advancedStats = useMemo(() => {
    let totalValue = 0;
    let received = 0;
    let completedCount = 0;
    
    projects.forEach(p => {
      totalValue += p.totalAmount;
      received += p.receivedAmount;
      if (p.status === 'Completed') {
        completedCount++;
      }
    });

    const collectionRate = totalValue > 0 ? (received / totalValue) * 100 : 0;
    const averageProjectValue = projects.length > 0 ? totalValue / projects.length : 0;
    
    return {
      collectionRate,
      averageProjectValue,
      completedCount,
      totalCount: projects.length
    };
  }, [projects]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          <h2 className="text-3xl font-bold text-white">Financial Intelligence</h2>
          <p className="text-zinc-400 mt-1">Deep dive into your project performance and revenue metrics</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search analytics..."
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
      </div>

      {/* Advanced Financial Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Collection Rate */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden bg-white/[0.01] group hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Billing Collection Rate</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{advancedStats.collectionRate.toFixed(1)}%</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">collected</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500" 
              style={{ width: `${advancedStats.collectionRate}%` }}
            />
          </div>
        </div>

        {/* Avg Project Value */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden bg-white/[0.01] group hover:border-indigo-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Avg Project Value</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{formatCurrency(advancedStats.averageProjectValue)}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">average</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-4 leading-none">Across {advancedStats.totalCount} projects listed</p>
        </div>

        {/* Project Completion */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden bg-white/[0.01] group hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Completion Ratio</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{advancedStats.completedCount} / {advancedStats.totalCount}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">delivered</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full bg-purple-500 transition-all duration-500" 
              style={{ width: `${advancedStats.totalCount > 0 ? (advancedStats.completedCount / advancedStats.totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Timeline */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <TrendingUp className="w-24 h-24 text-indigo-500" />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Income Trend</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ bottom: 25, left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#d4d4d8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  dy={10}
                />
                <YAxis 
                  stroke="#d4d4d8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₹${val/1000}k`}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#818cf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <PieIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Project Value by Type</h3>
          </div>
          <div className="h-72 flex flex-col sm:flex-row items-center">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #ffffff20', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: any) => formatCurrency(val as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 sm:w-48 mt-4 sm:mt-0">
              {typeData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Client Analysis */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Top Clients by Revenue</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData} layout="vertical" margin={{ left: 30, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#d4d4d8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #ffffff20', 
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(val: any) => formatCurrency(val as number)}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#10b981" 
                  radius={[0, 8, 8, 0]} 
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Lifecycle */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Project Status Overview</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#d4d4d8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#d4d4d8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #ffffff20', 
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                  barSize={40}
                >
                  {statusData.map((entry, index) => {
                    let color = '#71717a';
                    if (entry.name === 'Completed') color = '#10b981';
                    if (entry.name === 'Pending') color = '#f59e0b';
                    if (entry.name === 'High Pending') color = '#f43f5e';
                    if (entry.name === 'Ongoing') color = '#3b82f6';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
