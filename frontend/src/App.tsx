import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Bot, Zap, UserCheck, Clock, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
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

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Instâncias', href: '/instances', icon: Settings },
    { name: 'Agentes', href: '/agents', icon: Bot },
    { name: 'Conversas', href: '/conversations', icon: MessageSquare },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Atendentes', href: '/human-attendees', icon: UserCheck },
    { name: 'Disparos', href: '/discharges', icon: Zap },
    { name: 'Follow-ups', href: '/followups', icon: Clock },
    { name: 'Ajustes', href: '/settings', icon: Settings },
  ];

  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">WhatsApp AI</h1>
          <p className="text-sm text-gray-400 mt-1">Agents Dashboard</p>
        </div>

        <nav className="mt-6 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive
                    ? 'bg-gray-700 text-white border-r-4 border-green-500'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-2 py-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/instances" element={<PrivateRoute><Instances /></PrivateRoute>} />
          <Route path="/agents" element={<PrivateRoute><Agents /></PrivateRoute>} />
          <Route path="/conversations" element={<PrivateRoute><Conversations /></PrivateRoute>} />
          <Route path="/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
          <Route path="/human-attendees" element={<PrivateRoute><HumanAttendees /></PrivateRoute>} />
          <Route path="/discharges" element={<PrivateRoute><Discharges /></PrivateRoute>} />
          <Route path="/followups" element={<PrivateRoute><FollowUps /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        </Routes>
      </main>
    </div>
  );
}