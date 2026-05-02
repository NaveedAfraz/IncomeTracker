import { useState, useMemo } from 'react';
import { useGetProjectsQuery, useAddProjectMutation, useUpdateProjectMutation } from './store/api';
import { DashboardCards } from './components/DashboardCards';
import { ProjectsTable } from './components/ProjectsTable';
import { ProjectModal } from './components/ProjectModal';
import { TransactionsModal } from './components/TransactionsModal';
import { PaidPendingChart } from './components/PaidPendingChart';
import { ProjectListModal } from './components/ProjectListModal';
import { Activity, LayoutDashboard, Loader2 } from 'lucide-react';
import type { Project } from './types';

function App() {
  const { data: projects = [], isLoading, error } = useGetProjectsQuery();
  const [addProject] = useAddProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [transactionsProject, setTransactionsProject] = useState<Project | undefined>();
  const [activeCard, setActiveCard] = useState<'workValue' | 'received' | 'pending' | 'projects' | null>(null);

  const stats = useMemo(() => {
    return projects.reduce(
      (acc, project) => ({
        totalWorkValue: acc.totalWorkValue + project.totalAmount,
        totalReceived: acc.totalReceived + project.receivedAmount,
        totalPending: acc.totalPending + project.pendingAmount,
        numberOfProjects: acc.numberOfProjects + 1,
      }),
      {
        totalWorkValue: 0,
        totalReceived: 0,
        totalPending: 0,
        numberOfProjects: 0,
      }
    );
  }, [projects]);

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

  const handleSaveProject = async (projectData: Omit<Project, 'id' | 'pendingAmount' | 'status' | 'transactions'>) => {
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
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                System Online
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
          <p className="text-zinc-400">Monitor your projects and financial metrics in real-time.</p>
        </div>

        <DashboardCards stats={stats} onCardClick={setActiveCard} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <ProjectsTable
              projects={projects}
              onAddProject={handleAddProject}
              onEditProject={handleEditProject}
              onManageTransactions={handleManageTransactions}
            />
          </div>
          <div className="lg:col-span-1">
            <PaidPendingChart stats={stats} />
          </div>
        </div>
      </main>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
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
        />
      )}
    </div>
  );
}

export default App;
