import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { api, useGetProjectsQuery, useAddProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation } from './store/api';
import { logout } from './store/authSlice';
import type { RootState } from './store';
import { AuthPage } from './components/AuthPage';
import { DashboardCards } from './components/DashboardCards';
import { ProjectsTable } from './components/ProjectsTable';
import { ProjectModal } from './components/ProjectModal';
import { TransactionsModal } from './components/TransactionsModal';
import { PaidPendingChart } from './components/PaidPendingChart';
import { ProjectListModal } from './components/ProjectListModal';
import { AnalyticsView } from './components/AnalyticsView';
import { RecentActivity } from './components/RecentActivity';
import { Activity, LayoutDashboard, Loader2, LogOut } from 'lucide-react';
import { cn } from './utils/format';
import type { Project } from './types';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Show auth page if not logged in
  if (!isAuthenticated) return <AuthPage />;

  const handleLogout = () => {
    dispatch(logout());
    // Clear RTK Query cache so next user gets fresh data
    dispatch(api.util.resetApiState());
  };

  return <AuthenticatedApp user={user} onLogout={handleLogout} />;
}

type AuthenticatedAppProps = { user: { name: string; email: string } | null; onLogout: () => void };

function AuthenticatedApp({ user, onLogout }: AuthenticatedAppProps) {
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
      <nav className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Brand */}
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 group">
              <span className="text-3xl font-bold tracking-tight text-white font-display">
                Nexus<span className="text-indigo-400">Track</span>
              </span>
            </button>

            {/* Right side */}
            <div className="flex items-center gap-2">

              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setView('dashboard')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                    view === 'dashboard'
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => setView('analytics')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                    view === 'analytics'
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-5 bg-zinc-800 mx-1" />

              {/* Online indicator */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-5 bg-zinc-800 mx-1" />

              {/* User */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-xs font-medium text-zinc-300 max-w-[100px] truncate">
                  {user?.name || 'User'}
                </span>
              </div>

              {/* Sign out */}
              <button
                id="logout-btn"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>

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
