import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function Login() {
  const { setUser } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [providers, setProviders] = useState({});
  const [error, setError] = useState(
    params.get('error') === 'banned' ? 'This account is banned' : params.get('error') ? 'Social login failed. Please try again.' : ''
  );

  useEffect(() => {
    api.get('/auth/providers').then(setProviders).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      setUser(await api.post(`/auth/${mode}`, body));
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="form narrow">
      <h1>{mode === 'login' ? t('Log in') : t('Create an account')}</h1>

      {/* Plain links, because the browser must leave the page for the provider's login screen. */}
      {providers.google && (
        <a className="button social" href="/api/auth/google">
          Continue with Google
        </a>
      )}
      {providers.facebook && (
        <a className="button social" href="/api/auth/facebook">
          Continue with Facebook
        </a>
      )}

      <form onSubmit={submit}>
        {mode === 'register' && (
          <label>
            {t('Name')}
            <input value={form.name} onChange={set('name')} required minLength={2} />
          </label>
        )}
        <label>
          {t('Email')}
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          {t('Password')}
          <input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : 1} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">{mode === 'login' ? t('Log in') : t('Sign up')}</button>
      </form>

      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </button>
    </div>
  );
}
