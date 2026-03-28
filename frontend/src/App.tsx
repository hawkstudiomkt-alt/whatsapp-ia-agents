import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Bot, Zap, UserCheck, Clock } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Agents from './pages/Agents';
import Conversations from './pages/Conversations';
import Leads from './pages/Leads';
import HumanAttendees from './pages/HumanAttendees';
import Discharges from './pages/Discharges';
import FollowUps from './pages/FollowUps';
import SettingsPage from './pages/Settings';

export default function App() {
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">WhatsApp AI</h1>
          <p className="text-sm text-gray-400 mt-1">Agents Dashboard</p>
        </div>

        <nav className="mt-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
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
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/human-attendees" element={<HumanAttendees />} />
          <Route path="/discharges" element={<Discharges />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
