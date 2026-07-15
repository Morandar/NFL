import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createLeague, joinLeague, listMyLeagues, type LeagueContext } from '../leagues/service';
import { signOut } from '../auth/auth';

export function LeagueHub({ user, onSelect, onSignedOut }: {
  user: User;
  onSelect: (league: LeagueContext) => void;
  onSignedOut: () => void;
}) {
  const [leagues, setLeagues] = useState<LeagueContext[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try { setLeagues(await listMyLeagues()); setError(null); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Ligy se nepodařilo načíst.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const run = async (action: () => Promise<void>) => {
    setLoading(true); setError(null);
    try { await action(); await refresh(); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Akce se nezdařila.'); setLoading(false); }
  };

  return (
    <main className="league-hub">
      <header className="hub-header">
        <div className="app-brand"><div className="app-brand-mark">NC</div><div><p className="eyebrow">NFL CONQUEST</p><h1>Moje ligy</h1></div></div>
        <div className="hub-account"><span>{user.email ?? 'Přihlášený hráč'}</span><button className="ghost-button" onClick={() => void signOut().then(onSignedOut)}>Odhlásit</button></div>
      </header>
      <section className="hub-content">
        <div className="hub-intro"><p className="eyebrow">DLOUHODOBÁ HRA</p><h2>Pokračuj ve své lize</h2><p>Každá liga uchovává členy, sezony, hry i historii vítězů.</p></div>
        {error && <div className="auth-message">{error}</div>}
        <div className="league-grid">
          {leagues.map((league) => (
            <button key={league.leagueId} className="league-card" onClick={() => onSelect(league)}>
              <span className="league-role">{league.role}</span><h3>{league.leagueName}</h3>
              <p>{league.seasonName}</p><div><span>{league.seasonYear}</span><strong>Otevřít →</strong></div>
            </button>
          ))}
          {!loading && leagues.length === 0 && <div className="empty-leagues">Zatím nejsi členem žádné ligy.</div>}
        </div>
        <div className="hub-actions">
          <form onSubmit={(event) => { event.preventDefault(); if (name.trim().length >= 2) void run(() => createLeague(name, new Date().getFullYear())); }}>
            <h3>Založit ligu</h3><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Název ligy" maxLength={50} />
            <button className="primary-button" disabled={loading || name.trim().length < 2}>Vytvořit ligu</button>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); if (code.length === 8) void run(() => joinLeague(code)); }}>
            <h3>Připojit se</h3><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="Kód ligy" maxLength={8} />
            <button disabled={loading || code.length !== 8}>Připojit se k lize</button>
          </form>
        </div>
      </section>
    </main>
  );
}
