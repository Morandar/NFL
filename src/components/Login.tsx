import { useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const client = getSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      setError('');
      if (isRegister) {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login">
      <h2>{isRegister ? 'Registrovat se' : 'Přihlásit se'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Heslo"
          required
        />
        <button type="submit">{isRegister ? 'Registrovat' : 'Přihlásit'}</button>
      </form>
      {error && <div className="error-message">{error}</div>}
      <button type="button" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Už máte účet? Přihlásit se' : 'Potřebujete účet? Registrovat se'}
      </button>
    </div>
  );
}