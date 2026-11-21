import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = mode === 'login' ? await login(form.email, form.password) : await register(form);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'contractor' ? '/jobs' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <form onSubmit={submit} className="civic-card p-6 space-y-4">
        <h1 className="text-xl font-bold text-brand-text">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        {mode === 'register' && (
          <input className="civic-input w-full text-xs" placeholder="Full name" value={form.name} onChange={set('name')} required />
        )}
        <input className="civic-input w-full text-xs" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className="civic-input w-full text-xs" type="password" placeholder="Password" value={form.password} onChange={set('password')} required minLength={6} />
        {error && <p className="text-xs text-red-900 dark:text-red-300">{error}</p>}
        <button className="btn-primary w-full py-2 text-xs font-semibold" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}</button>
        <button type="button" className="text-[11px] text-brand-text opacity-70 underline w-full" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New here? Create a citizen account' : 'Already have an account? Sign in'}
        </button>
        <p className="text-[10px] text-brand-text opacity-50 leading-relaxed">
          After running <code>npm run seed</code> in backend/ you can use the demo accounts listed in the README.
        </p>
      </form>
    </div>
  );
}
