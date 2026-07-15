import { useState } from 'react';
import { sendMagicLink, signInWithProvider } from '../auth/auth';

export function AuthScreen({ onLocalMode }: { onLocalMode: () => void }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runProvider = async (provider: 'google' | 'apple') => {
    setBusy(true);
    setMessage(null);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Přihlášení se nezdařilo.');
      setBusy(false);
    }
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setMessage('Zadej platnou e-mailovou adresu.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await sendMagicLink(email);
      setMessage('Přihlašovací odkaz je na cestě. Zkontroluj e-mail.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Odeslání odkazu se nezdařilo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page auth-page">
      <section className="login-hero">
        <div className="brand-mark" aria-hidden="true">NC</div>
        <p className="eyebrow">TVÁ NFL LIGA</p>
        <h1>Jedna liga.<br />Každá sezóna.</h1>
        <p className="login-lead">Vrať se kdykoliv, sleduj historii ligy a buduj svoje území napříč sezonami.</p>
        <div className="feature-row"><span>Trvalý profil</span><span>Historie sezon</span><span>Více zařízení</span></div>
      </section>
      <section className="login-card auth-card">
        <div className="login-card-heading">
          <span className="step-pill">01</span>
          <div><p className="eyebrow">PŘIHLÁŠENÍ</p><h2>Vítej zpátky</h2></div>
        </div>
        <div className="oauth-buttons">
          <button className="oauth-button" onClick={() => void runProvider('google')} disabled={busy}>
            <span aria-hidden="true">G</span> Pokračovat přes Google
          </button>
          <button className="oauth-button" onClick={() => void runProvider('apple')} disabled={busy}>
            <span aria-hidden="true">●</span> Pokračovat přes Apple
          </button>
        </div>
        <div className="login-divider"><span>nebo e-mailem</span></div>
        <form onSubmit={submitEmail}>
          <label htmlFor="auth-email">E-mail</label>
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ty@example.com" autoComplete="email" />
          <button className="primary-button" type="submit" disabled={busy}>Poslat přihlašovací odkaz →</button>
        </form>
        {message && <div className="auth-message" role="status">{message}</div>}
        <button className="local-mode-button" onClick={onLocalMode}>Pokračovat pouze na tomto zařízení</button>
      </section>
    </main>
  );
}
