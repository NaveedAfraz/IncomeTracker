import { useState, useMemo } from 'react';
import { useGetProjectsQuery, useAddProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation } from './store/api';
import { DashboardCards } from './components/DashboardCards';
import { ProjectsTable } from './components/ProjectsTable';
import { ProjectModal } from './components/ProjectModal';
import { TransactionsModal } from './components/TransactionsModal';
import { PaidPendingChart } from './components/PaidPendingChart';
import { ProjectListModal } from './components/ProjectListModal';
import { AnalyticsView } from './components/AnalyticsView';
import { RecentActivity } from './components/RecentActivity';
import { Activity, LayoutDashboard, Loader2 } from 'lucide-react';
import { cn } from './utils/format';
import type { Project } from './types';

function App() {
  const { data: projects = [], isLoading, error } = useGetProjectsQuery();
  const [addProject] = useAddProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [transactionsProject, setTransactionsProject] = useState<Project | undefined>();
  const [activeCard, setActiveCard] = useState<'workValue' | 'received' | 'pending' | 'projects' | 'failed' | null>(null);

  const stats = useMemo(() => {
    return projects.reduce(
      (acc, project) => {
        const isFailed = project.status === 'Failed';
        return {
          totalWorkValue: acc.totalWorkValue + project.totalAmount,
          totalReceived: acc.totalReceived + project.receivedAmount,
          totalPending: acc.totalPending + (isFailed ? 0 : project.pendingAmount),
          totalFailed: acc.totalFailed + (isFailed ? project.pendingAmount : 0),
          numberOfProjects: acc.numberOfProjects + 1,
        };
      },
      {
        totalWorkValue: 0,
        totalReceived: 0,
        totalPending: 0,
        totalFailed: 0,
        numberOfProjects: 0,
      }
    );
  }, [projects]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [view, setView] = useState<'dashboard' | 'analytics'>('dashboard');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const addYear = (dateStr: string | null | undefined) => {
      if (!dateStr) return;
      const y = new Date(dateStr).getFullYear();
      if (!isNaN(y)) years.add(y.toString());
    };
    projects.forEach(p => {
      addYear(p.startDate);   // real start date column
      addYear(p.endDate);     // real end date column (null = ongoing, skip)
      addYear(p.created_at);
      // Fallback: parse period text for legacy rows without startDate
      if (!p.startDate && p.period) {
        const yearMatches = p.period.match(/\b(20\d{2})\b/g);
        if (yearMatches) yearMatches.forEach(y => years.add(y));
      }
      p.transactions.forEach(t => addYear(t.date));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || p.type === filterType;
      const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
      
      if (filterYear === 'All') return matchesSearch && matchesType && matchesStatus;

      const projectYears = new Set<string>();
      const addYear = (dateStr: string | null | undefined) => {
        if (!dateStr) return;
        const y = new Date(dateStr).getFullYear();
        if (!isNaN(y)) projectYears.add(y.toString());
      };

      // Use real date columns as primary source
      if (p.startDate) {
        addYear(p.startDate);
        // If ongoing (no endDate), this project spans from startDate to present
        if (!p.endDate) {
          const startYear = new Date(p.startDate).getFullYear();
          const currentYear = new Date().getFullYear();
          for (let y = startYear; y <= currentYear; y++) projectYears.add(y.toString());
        } else {
          addYear(p.endDate);
          // Fill years between start and end
          const sy = new Date(p.startDate).getFullYear();
          const ey = new Date(p.endDate).getFullYear();
          for (let y = sy; y <= ey; y++) projectYears.add(y.toString());
        }
      } else {
        // Fallback for legacy rows without startDate
        addYear(p.created_at);
        if (p.period) {
          const yearMatches = p.period.match(/\b(20\d{2})\b/g);
          if (yearMatches) yearMatches.forEach(y => projectYears.add(y));
        }
      }
      p.transactions.forEach(t => addYear(t.date));

      const matchesYear = projectYears.has(filterYear);
      return matchesSearch && matchesType && matchesStatus && matchesYear;
    });
  }, [projects, searchTerm, filterType, filterStatus, filterYear]);

  const filteredStats = useMemo(() => {
    return filteredProjects.reduce(
      (acc, project) => {
        // If filtering by year, only count transaction amounts for that year
        let received = project.receivedAmount;
        if (filterYear !== 'All') {
          received = project.transactions
            .filter(t => new Date(t.date).getFullYear().toString() === filterYear && t.type === 'Paid')
            .reduce((sum, t) => sum + t.amount, 0);
        }

        const isFailed = project.status === 'Failed';
        const pending = isFailed ? 0 : (project.totalAmount - received);
        const failed = isFailed ? (project.totalAmount - received) : 0;

        return {
          totalWorkValue: acc.totalWorkValue + project.totalAmount,
          totalReceived: acc.totalReceived + received,
          totalPending: acc.totalPending + pending,
          totalFailed: acc.totalFailed + failed,
          numberOfProjects: acc.numberOfProjects + 1,
        };
      },
      {
        totalWorkValue: 0,
        totalReceived: 0,
        totalPending: 0,
        totalFailed: 0,
        numberOfProjects: 0,
      }
    );
  }, [filteredProjects, filterYear]);

  const handleAddProject = () => {
    setEditingProject(undefined);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleManageTransactions = (project: Project) => {
    setTransactionsProject(project);
  };

  const handleSaveProject = async (projectData: Omit<Project, 'id' | 'pendingAmount' | 'status' | 'transactions'> & { statusOverride?: string }) => {
    try {
      if (editingProject) {
        await updateProject({ id: editingProject.id, changes: projectData }).unwrap();
      } else {
        await addProject(projectData).unwrap();
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleDeleteProject = async (idOrProject: string | Project) => {
    const id = typeof idOrProject === 'string' ? idOrProject : idOrProject.id;
    const name = typeof idOrProject === 'string' 
      ? projects.find(p => p.id === id)?.name || 'this project' 
      : idOrProject.name;

    if (window.confirm(`Are you sure you want to delete "${name}"? All associated transactions will also be permanently deleted.`)) {
      try {
        await deleteProject(id).unwrap();
        setIsModalOpen(false);
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin relative z-10" />
        </div>
        <p className="text-indigo-200/60 font-medium tracking-wide animate-pulse">Syncing Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl max-w-md text-center">
          <Activity className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-zinc-400">Failed to load data. Please verify your backend connection.</p>
        </div>
      </div>
    );
  }

  const currentTransactionsProject = transactionsProject 
    ? projects.find(p => p.id === transactionsProject.id) || transactionsProject 
    : undefined;


  return (
    <div className="min-h-screen bg-zinc-950 selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                <div className="bg-zinc-900 border border-white/10 p-2.5 rounded-xl text-indigo-400 relative">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
                  Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Track</span>
                </h1>
                <p className="text-xs text-zinc-500 font-medium mt-1">Financial Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                <button 
                  onClick={() => setView('dashboard')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2",
                    view === 'dashboard' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button 
                  onClick={() => setView('analytics')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2",
                    view === 'analytics' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Intelligence</span>
                </button>
              </div>
              
              <div className="hidden lg:flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                System Online
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {view === 'dashboard' ? (
          <>
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
              <p className="text-zinc-400">Monitor your projects and financial metrics in real-time.</p>
            </div>

            <DashboardCards stats={stats} onCardClick={setActiveCard} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <ProjectsTable
                  projects={filteredProjects}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterYear={filterYear}
                  setFilterYear={setFilterYear}
                  availableYears={availableYears}
                  onAddProject={handleAddProject}
                  onEditProject={handleEditProject}
                  onManageTransactions={handleManageTransactions}
                  onDeleteProject={handleDeleteProject}
                />
              </div>
              <div className="lg:col-span-1 flex flex-col gap-6">
                <PaidPendingChart stats={filteredStats} />
                <RecentActivity projects={projects} onManageTransactions={handleManageTransactions} />
              </div>
            </div>
          </>
        ) : (
          <AnalyticsView 
            projects={filteredProjects} 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            availableYears={availableYears}
            onBack={() => setView('dashboard')} 
          />
        )}
      </main>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        project={editingProject}
      />

      {currentTransactionsProject && (
        <TransactionsModal
          project={currentTransactionsProject}
          onClose={() => setTransactionsProject(undefined)}
        />
      )}

      {activeCard && (
        <ProjectListModal
          type={activeCard}
          projects={projects}
          onClose={() => setActiveCard(null)}
          onManageTransactions={handleManageTransactions}
          onEdit={(project) => {
            setActiveCard(null);
            setEditingProject(project);
            setIsModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
