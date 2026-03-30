import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', response.data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            navigate('/');
        } catch (err: any) {
            setError('E-mail ou senha inválidos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, sans-serif',
        }}>
            <div style={{
                background: '#1a1d27',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '400px',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                    <div style={{
                        width: '36px', height: '36px',
                        background: '#22c55e',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff' }}>WhatsApp AI</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Agents Dashboard</div>
                    </div>
                </div>

                <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                    Bem-vindo de volta
                </h1>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem' }}>
                    Entre com suas credenciais para acessar o painel
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                            E-mail
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@agencia.com"
                            required
                            style={{
                                width: '100%',
                                background: '#0f1117',
                                border: '0.5px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                fontSize: '14px',
                                color: '#fff',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                background: '#0f1117',
                                border: '0.5px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                fontSize: '14px',
                                color: '#fff',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {error && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '1rem' }}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: loading ? '#166534' : '#22c55e',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: '#fff',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '0.5rem',
                        }}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
                    WhatsApp AI Agents © 2026
                </p>
            </div>
        </div>
    );
}