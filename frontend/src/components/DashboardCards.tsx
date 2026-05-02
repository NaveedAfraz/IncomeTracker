import { Briefcase, IndianRupee, Wallet, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { DashboardStats } from '../types';

interface DashboardCardsProps {
  stats: DashboardStats;
  onCardClick: (type: 'workValue' | 'received' | 'pending' | 'projects') => void;
}

export const DashboardCards = ({ stats, onCardClick }: DashboardCardsProps) => {
  const cards = [
    {
      type: 'workValue' as const,
      title: 'Total Work Value',
      value: formatCurrency(stats.totalWorkValue),
      icon: <Briefcase className="w-6 h-6 text-indigo-400" />,
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:border-indigo-500/40 cursor-pointer',
    },
    {
      type: 'received' as const,
      title: 'Total Received',
      value: formatCurrency(stats.totalReceived),
      icon: <IndianRupee className="w-6 h-6 text-emerald-400" />,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:border-emerald-500/40 cursor-pointer',
    },
    {
      type: 'pending' as const,
      title: 'Total Pending',
      value: formatCurrency(stats.totalPending),
      icon: <Wallet className="w-6 h-6 text-rose-400" />,
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:border-rose-500/40 cursor-pointer',
    },
    {
      type: 'projects' as const,
      title: 'Total Projects',
      value: stats.numberOfProjects.toString(),
      icon: <CreditCard className="w-6 h-6 text-purple-400" />,
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:border-purple-500/40 cursor-pointer',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          onClick={() => onCardClick(card.type)}
          className={`group glass-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${card.glow}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">{card.title}</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${card.bg} ${card.border} border`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
