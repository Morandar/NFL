import { useState } from 'react';
import type { LeagueGame } from '../leagues/service';

interface LoginProps {
  onLocalLogin: (username: string) => void;
  onCreateGame: (username: string, gameName: string) => Promise<void>;
  onJoinGame: (username: string, code: string) => Promise<void>;
  onResumeGame?: (game: LeagueGame) => Promise<void>;
  onArchiveGame?: (game: LeagueGame) => Promise<void>;
  onlineEnabled: boolean;
  leagueName?: string;
  availableGames?: LeagueGame[];
  onBackToLeagues?: () => void;
  onBackToSignIn?: () => void;
  defaultUsername?: string;
}

export function Login({ onLocalLogin, onCreateGame, onJoinGame, onResumeGame, onArchiveGame, onlineEnabled, leagueName, availableGames = [], onBackToLeagues, onBackToSignIn, defaultUsername = '' }: LoginProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [gameName, setGameName] = useState('Moje NFL sezóna');
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState<'create' | 'join' | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const validateName = (): string | null => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Zadejte uživatelské jméno');
      return null;
    }
    if (trimmed.length < 2) {
      setError('Uživatelské jméno musí mít alespoň 2 znaky');
      return null;
    }
    setError('');
    return trimmed;
  };

  const runOnlineAction = async (action: 'create' | 'join', codeOverride?: string) => {
    const name = validateName();
    if (!name) return;
    const code = codeOverride ?? gameCode;
    if (action === 'join' && code.trim().length !== 6) {
      setError('Kód hry musí mít šest znaků.');
      return;
    }
    setLoadingAction(action);
    try {
      if (action === 'create') {
        if (gameName.trim().length < 2) throw new Error('Název hry musí mít alespoň 2 znaky.');
        await onCreateGame(name, gameName);
      }
      else await onJoinGame(name, code);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Připojení ke hře se nezdařilo.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">NC</div>
        <p className="eyebrow">NFL GAME NIGHT</p>
        <h1 id="login-title">Ovládni mapu.<br />Týden po týdnu.</h1>
        <p className="login-lead">
          Draftuj týmy, vyhrávej zápasy a rozšiřuj svoje území napříč celou ligou.
        </p>
        <div className="feature-row" aria-label="Hlavní funkce">
          <span>32 týmů</span>
          <span>Živá mapa</span>
          <span>Hra s přáteli</span>
        </div>
      </section>

      <section className="login-card" aria-label="Připojení ke hře">
        <div className="login-card-heading">
          <span className="step-pill">01</span>
          <div>
            <p className="eyebrow">VSTUP DO HRY</p>
            <h2>{leagueName ?? 'Jak ti budeme říkat?'}</h2>
          </div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void runOnlineAction('create'); }}>
          <label htmlFor="username">Hráčské jméno</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Např. Kuba"
            autoComplete="nickname"
            required
            maxLength={20}
            aria-describedby={error ? 'username-error' : undefined}
          />
          {onlineEnabled && (
            <>
              {availableGames.length > 0 && (
                <div className="saved-games">
                  <span className="field-label">Rozehrané hry</span>
                  {availableGames.map((game) => (
                    <div key={game.id} className="saved-game-row">
                      <button
                        type="button"
                        className="saved-game-button"
                        disabled={loadingAction !== null || archivingId !== null}
                        onClick={() => {
                          setLoadingAction('join');
                          setError('');
                          void onResumeGame?.(game).catch((actionError) => {
                            setError(actionError instanceof Error ? actionError.message : 'Hru se nepodařilo načíst.');
                          }).finally(() => setLoadingAction(null));
                        }}
                      >
                        <span><strong>{game.name}</strong><small>{game.code} · {game.status === 'completed' ? 'Dokončená' : 'Rozehraná'}</small></span>
                        <span>Pokračovat →</span>
                      </button>
                      {onArchiveGame && (
                        <button type="button" className="archive-game-button" disabled={loadingAction !== null || archivingId !== null} onClick={() => {
                          if (!window.confirm(`Odebrat hru „${game.name}“ z přehledu? Historie zůstane zachovaná.`)) return;
                          setArchivingId(game.id);
                          setError('');
                          void onArchiveGame(game).catch((actionError) => {
                            setError(actionError instanceof Error ? actionError.message : 'Hru se nepodařilo odebrat.');
                          }).finally(() => setArchivingId(null));
                        }}>{archivingId === game.id ? '…' : 'Odebrat'}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <label htmlFor="game-name">Název nové hry</label>
              <input id="game-name" value={gameName} onChange={(event) => setGameName(event.target.value)} maxLength={60} placeholder="Např. Sezóna s klukama 2026" />
              <button type="submit" className="primary-button" disabled={loadingAction !== null}>
                {loadingAction === 'create' ? 'Vytvářím…' : 'Vytvořit novou hru'} <span aria-hidden="true">→</span>
              </button>
              <div className="login-divider"><span>nebo se připoj</span></div>
              <label htmlFor="game-code">Kód hry</label>
              <div className="join-code-row">
                <input
                  id="game-code"
                  value={gameCode}
                  onChange={(event) => setGameCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123"
                  autoComplete="off"
                  maxLength={6}
                />
                <button type="button" onClick={() => void runOnlineAction('join')} disabled={loadingAction !== null}>
                  {loadingAction === 'join' ? 'Připojuji…' : 'Připojit'}
                </button>
              </div>
            </>
          )}
          {error && <div id="username-error" className="error-message">{error}</div>}
          <button type="button" className={onlineEnabled ? 'local-mode-button' : 'primary-button'} onClick={() => {
            const name = validateName();
            if (name) onLocalLogin(name);
          }}>
            {onlineEnabled ? 'Pokračovat pouze lokálně' : <>Pokračovat <span aria-hidden="true">→</span></>}
          </button>
          {onlineEnabled && onBackToLeagues && <button type="button" className="ghost-button back-to-leagues" onClick={onBackToLeagues}>← Zpět na moje ligy</button>}
          {!onlineEnabled && onBackToSignIn && <button type="button" className="ghost-button back-to-leagues" onClick={onBackToSignIn}>← Zpět na přihlášení</button>}
        </form>
        <p className="login-note">{onlineEnabled ? 'Hra je trvale propojená s tvým účtem a ligou.' : 'Online režim se aktivuje po nastavení nového Supabase.'}</p>
      </section>
    </main>
  );
}
