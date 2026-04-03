import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, Users, Bot, Zap,
  UserCheck, Clock, LogOut, Settings, Radio, ChevronRight,
} from 'lucide-react';
import { useEffect } from 'react';
import { api } from './lib/api';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Agents from './pages/Agents';
import Conversations from './pages/Conversations';
import Leads from './pages/Leads';
import HumanAttendees from './pages/HumanAttendees';
import Discharges from './pages/Discharges';
import FollowUps from './pages/FollowUps';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard',   href: '/',               icon: LayoutDashboard },
      { name: 'Leads',       href: '/leads',           icon: Users },
      { name: 'Agentes',     href: '/agents',          icon: Bot },
      { name: 'Instâncias',  href: '/instances',       icon: Radio },
    ],
  },
  {
    label: 'Automação',
    items: [
      { name: 'Disparos',    href: '/discharges',      icon: Zap },
      { name: 'Follow-ups',  href: '/followups',       icon: Clock },
      { name: 'Conversas',   href: '/conversations',   icon: MessageSquare },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { name: 'Atendentes',  href: '/human-attendees', icon: UserCheck },
      { name: 'Ajustes',     href: '/settings',        icon: Settings },
    ],
  },
];

export default function App() {
  const location = useLocation();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#060606' }}>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-20"
        style={{
          width: '220px',
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Rat icon container */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              background: '#B6FF00',
              boxShadow: '0 0 18px rgba(182,255,0,0.45)',
            }}
          >
            🐀
          </div>
          <div>
            <span
              className="text-lg font-bold leading-none tracking-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#f0f0f0' }}
            >
              Rat<span style={{ color: '#B6FF00' }}>tix</span>
            </span>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: '#555', fontFamily: 'Space Mono, monospace', letterSpacing: '1px' }}
            >
              AI AGENTS
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p
                className="px-2 mb-2 text-[10px] uppercase tracking-[1.8px]"
                style={{ color: '#444', fontFamily: 'Space Mono, monospace' }}
              >
                {group.label}
              </p>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 group"
                    style={
                      isActive
                        ? {
                            background: 'rgba(182,255,0,0.08)',
                            border: '1px solid rgba(182,255,0,0.18)',
                            color: '#B6FF00',
                          }
                        : {
                            color: '#555',
                            border: '1px solid transparent',
                          }
                    }
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = '#ddd';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = '#555';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full pulse-dot"
                        style={{ background: '#B6FF00', boxShadow: '0 0 6px #B6FF00' }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            className="flex items-center gap-2.5 p-2.5 rounded-xl"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #7D53FF, #5a30ff)' }}
            >
              R
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Rattix</p>
              <p className="text-[10px]" style={{ color: '#555' }}>Admin</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1 rounded-lg transition-colors hover:text-white"
              style={{ color: '#444' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="flex-1 min-h-screen overflow-y-auto" style={{ marginLeft: '220px', padding: '32px 36px' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"                element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/instances"       element={<PrivateRoute><Instances /></PrivateRoute>} />
          <Route path="/agents"          element={<PrivateRoute><Agents /></PrivateRoute>} />
          <Route path="/conversations"   element={<PrivateRoute><Conversations /></PrivateRoute>} />
          <Route path="/leads"           element={<PrivateRoute><Leads /></PrivateRoute>} />
          <Route path="/human-attendees" element={<PrivateRoute><HumanAttendees /></PrivateRoute>} />
          <Route path="/discharges"      element={<PrivateRoute><Discharges /></PrivateRoute>} />
          <Route path="/followups"       element={<PrivateRoute><FollowUps /></PrivateRoute>} />
          <Route path="/settings"        element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        </Routes>
      </main>
    </div>
  );
}
