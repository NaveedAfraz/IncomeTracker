import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLoginMutation, useRegisterMutation } from '../store/api';
import { setCredentials } from '../store/authSlice';
import { Eye, EyeOff, Loader2, ArrowRight, TrendingUp, DollarSign, BarChart2, Activity } from 'lucide-react';

// ── Particle canvas (no external deps) ───────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', () => { mouse.current = { x: -9999, y: -9999 }; });

    const COUNT = 55;
    const nodes = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.8,
    }));

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      nodes.forEach(n => {
        const dx = n.x - mouse.current.x;
        const dy = n.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          n.vx += (dx / dist) * 0.4;
          n.vy += (dy / dist) * 0.4;
        }
        n.vx *= 0.97; n.vy *= 0.97;
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 1.5) { n.vx = (n.vx / speed) * 1.5; n.vy = (n.vy / speed) * 1.5; }
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;
      });

      const LINK = 130;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${(1 - d / LINK) * 0.22})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(129,140,248,0.55)';
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}


// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = to / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [to]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

// ── Floating stat card ───────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, delay }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub: string; delay: string;
}) {
  return (
    <div
      className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-4 backdrop-blur-sm flex items-start gap-3 animate-[fadeSlideUp_0.6s_ease_forwards] opacity-0"
      style={{ animationDelay: delay }}
    >
      <div className="mt-0.5 p-1.5 bg-indigo-500/10 rounded-lg">
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <div>
        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function AuthPage() {
  const dispatch = useDispatch();
  const [loginApi, { isLoading: loggingIn }] = useLoginMutation();
  const [registerApi, { isLoading: registering }] = useRegisterMutation();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const isLoading = loggingIn || registering;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (!name.trim()) return setError('Name is required');
      if (password !== confirmPassword) return setError('Passwords do not match');
      if (password.length < 6) return setError('Password must be at least 6 characters');
    }
    try {
      const result = mode === 'login'
        ? await loginApi({ email, password }).unwrap()
        : await registerApi({ name: name.trim(), email, password }).unwrap();
      dispatch(setCredentials({ token: result.token, user: result.user }));
    } catch (err: unknown) {
      const apiError = err as { data?: { error?: string } };
      setError(apiError?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  const switchMode = () => {
    setSwitching(true);
    setTimeout(() => {
      setMode(m => m === 'login' ? 'register' : 'login');
      setError(''); setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
      setSwitching(false);
    }, 180);
  };

  const inputCls = "w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/70 focus:bg-zinc-800 [color-scheme:dark]";

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>

      <div className="min-h-screen bg-zinc-950 flex">

        {/* ── Left panel (interactive visual) ─────────────────────── */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-zinc-950 flex-col justify-between p-10">
          {/* Canvas */}
          <ParticleCanvas />

          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950/60 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />

          {/* Top brand */}
          <div className="relative z-10">
            <span className="text-3xl font-bold tracking-tight text-white font-display">
              Nexus<span className="text-indigo-400">Track</span>
            </span>
            <p className="text-xs text-zinc-600 mt-1 font-medium uppercase tracking-widest">Financial Intelligence</p>
          </div>

          {/* Stat cards grid */}
          <div className="relative z-10 grid grid-cols-2 gap-3 mb-2">
            <StatCard icon={DollarSign}  label="Total Earned"   value={<Counter to={284500} prefix="₹" />} sub="Across all projects"  delay="0.3s" />
            <StatCard icon={TrendingUp}  label="Work Value"     value={<Counter to={412000} prefix="₹" />} sub="Projects invoiced"    delay="0.45s" />
            <StatCard icon={BarChart2}   label="Projects"       value={<Counter to={24} />}                sub="Tracked so far"      delay="0.6s" />
            <StatCard icon={Activity}    label="Completion"     value={<Counter to={78} suffix="%" />}     sub="Average project rate" delay="0.75s" />
          </div>

          {/* Tagline */}
          <p
            className="relative z-10 text-xs text-zinc-600 animate-[fadeSlideUp_0.6s_ease_1s_forwards] opacity-0"
            style={{ animationFillMode: 'forwards' }}
          >
            Track projects · Log payments · Understand your income
          </p>
        </div>

        {/* ── Right panel (form) ───────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-6 bg-zinc-950 lg:bg-zinc-950/95 border-l border-zinc-800/40">
          <div
            className={`w-full max-w-[340px] transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ${switching ? 'opacity-0 scale-[0.98]' : ''}`}
          >
            {/* Mobile brand */}
            <div className="lg:hidden mb-8 text-center">
              <span className="text-xl font-bold tracking-tight text-white font-display">
                Nexus<span className="text-indigo-400">Track</span>
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1 font-display">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-sm text-zinc-500 mb-7">
              {mode === 'login' ? 'Sign in to your dashboard' : 'Create your free account'}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Name</label>
                  <input id="auth-name" type="text" value={name} onChange={e => setName(e.target.value)}
                    className={inputCls} placeholder="Naveed Afraz" required autoComplete="name" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" required autoComplete="email" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input id="auth-password" type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    className={`${inputCls} pr-10`} placeholder="••••••••" required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Toggle">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                  <div className="relative">
                    <input id="auth-confirm" type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className={`${inputCls} pr-10`} placeholder="••••••••" required autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Toggle">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  {error}
                </p>
              )}

              <button id="auth-submit" type="submit" disabled={isLoading}
                className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            <p className="text-center text-xs text-zinc-600 mt-6">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button id="auth-switch-mode" type="button" onClick={switchMode}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
