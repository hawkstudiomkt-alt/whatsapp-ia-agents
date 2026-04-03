import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      navigate('/');
    } catch {
      setError('E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#060606',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '11px 16px',
    fontSize: '14px',
    color: '#f0f0f0',
    outline: 'none',
    fontFamily: 'Space Grotesk, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#060606', position: 'relative', overflow: 'hidden' }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(182,255,0,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(182,255,0,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
          pointerEvents: 'none',
        }}
      />

      {/* Glow orb */}
      <div
        style={{
          position: 'fixed',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(182,255,0,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              background: '#B6FF00',
              boxShadow: '0 0 20px rgba(182,255,0,0.4)',
            }}
          >
            🐀
          </div>
          <div>
            <span
              className="text-xl font-bold"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#f0f0f0' }}
            >
              Rat<span style={{ color: '#B6FF00' }}>tix</span>
            </span>
            <p
              className="text-[10px]"
              style={{ color: '#555', fontFamily: 'Space Mono, monospace', letterSpacing: '1px' }}
            >
              AI AGENTS
            </p>
          </div>
        </div>

        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Bem-vindo de volta
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: '#555', fontFamily: 'Space Mono, monospace' }}
        >
          Acesse o painel de controle AgentR
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs mb-2 font-mono-rattix"
              style={{ color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}
            >
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@rattix.com"
              required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(182,255,0,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div>
            <label
              className="block text-xs mb-2 font-mono-rattix"
              style={{ color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(182,255,0,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.015 }}
            whileTap={{ scale: loading ? 1 : 0.985 }}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm rounded-xl mt-2"
            style={{
              background: loading ? 'rgba(182,255,0,0.5)' : '#B6FF00',
              color: '#000',
              padding: '13px',
              boxShadow: loading ? 'none' : '0 0 24px rgba(182,255,0,0.3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
              fontFamily: 'Space Grotesk, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-black border-t-transparent rounded-full"
              />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar
              </>
            )}
          </motion.button>
        </form>

        <p
          className="text-center mt-8 text-xs font-mono-rattix"
          style={{ color: '#333' }}
        >
          Rattix © {new Date().getFullYear()} — Powered by AgentR
        </p>
      </motion.div>
    </div>
  );
}
