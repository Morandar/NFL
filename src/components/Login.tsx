import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Zadejte uživatelské jméno');
      return;
    }
    if (trimmed.length < 2) {
      setError('Uživatelské jméno musí mít alespoň 2 znaky');
      return;
    }
    setError('');
    onLogin(trimmed);
  };

  return (
    <div className="login">
      <h2>Připojit se k hře</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Uživatelské jméno"
          required
          maxLength={20}
        />
        <button type="submit">Připojit se</button>
      </form>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}