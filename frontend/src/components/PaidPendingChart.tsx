import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { DashboardStats } from '../types';
import { formatCurrency } from '../utils/format';

interface PaidPendingChartProps {
  stats: DashboardStats;
}

export const PaidPendingChart = ({ stats }: PaidPendingChartProps) => {
  const data = [
    { name: 'Received', value: stats.totalReceived, color: '#34d399' }, // emerald-400
    { name: 'Pending', value: stats.totalPending, color: '#fb7185' },   // rose-400
  ];

  if (stats.totalWorkValue === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center h-80 border-dashed border-white/20">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <div className="w-8 h-8 border-4 border-zinc-600 rounded-full border-t-zinc-400 animate-spin"></div>
        </div>
        <p className="text-zinc-500 font-medium">No data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 h-80 flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
      
      <h3 className="text-lg font-bold text-white mb-4 relative z-10">Payment Distribution</h3>
      <div className="flex-1 min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(24, 24, 27, 0.9)',
                backdropFilter: 'blur(12px)',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-zinc-300 font-medium ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
