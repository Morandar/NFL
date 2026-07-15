# NFL Conquest Map

A web-based conquest game where players draft NFL teams and battle for territorial control throughout the season.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Supabase Multiplayer

Multiplayer uses permanent Supabase accounts, leagues, seasons, six-character game codes, Row Level Security and optimistic state versioning. Returning players can reopen games from their league dashboard.

1. Create a new Supabase project. Keep anonymous sign-ins disabled.
2. Run the migration in `supabase/migrations/202607150001_initial_multiplayer.sql` using the Supabase CLI (`supabase db push`) or the SQL editor.
3. Create a `.env.local` from `.env.example`:
   ```ini
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. In Supabase Authentication enable Email and, as desired, Google and Apple. Add the local and Vercel domains to URL Configuration / Redirect URLs.
5. Start the app (`npm run dev`), sign in, create a league and share its eight-character invite code. Games remain attached to the league and season.
6. Without these variables the app offers a local-only mode backed by versioned LocalStorage.

The browser receives only the public anon key. Never expose the Supabase service-role key in Vite or Vercel variables.

## How to Play

1. **Setup Phase**
   - Add 2-8 players with unique names
   - Configure game settings:
     - Picks per player (1-3 teams)
     - Margin rules (8+ point wins = extra capture)
     - Playoff boost (+1 capture for playoff wins)
     - Super Bowl sweep (winner takes all territories)

2. **Draft Phase**
   - Snake draft format
   - Players take turns selecting teams
   - Each player's color is determined by their first pick

3. **Season Phase**
   - Import weekly results via CSV
   - Watch as territories change hands
   - Monitor standings and territorial control

## CSV Format

Import game results using this format:

```csv
week,winner,loser,margin,isPlayoff,isSuperBowl
1,KC,CIN,7,false,false
1,SF,DAL,10,false,false
18,KC,BAL,3,true,false
19,KC,SF,10,true,true
```

- `week`: Week number (1-19+)
- `winner`: Team code of the winning team
- `loser`: Team code of the losing team
- `margin`: Point differential (optional)
- `isPlayoff`: true/false
- `isSuperBowl`: true/false

## Victory Conditions

- **Instant Win**: Control 90% or more of the map (29+ teams)
- **Season End**: Player with the most territories after the Super Bowl wins

## Preview Mode

Open a projection-friendly preview window:
1. Click "Open Preview" during the season
2. A new window opens with a clean display
3. Auto-refreshes every second to show latest changes

## Features

- Interactive map showing territorial control
- Real-time standings with ownership percentages
- Game log tracking all conquests
- Persistent state (survives browser refresh)
- Accessibility features (keyboard navigation, ARIA labels)

## Conquest Rules

1. **Basic Capture**: Winner takes loser's territory
2. **Margin Rule**: 8+ point wins grant 1 extra random capture
3. **Playoff Boost**: Playoff wins grant 1 extra capture
4. **Super Bowl Sweep**: SB winner takes ALL loser's territories
5. **Neutral Winner**: Unowned teams that win maintain previous owner

## Technical Details

Built with:
- React 19 + TypeScript
- Vite for fast development
- LocalStorage for persistence
- SVG overlay for interactive territories
- Dark theme optimized for projectors

## Assets Required

Place these files in `src/assets/`:
- `nfl_conquest_base_washed.png` - Grayscale base map
- `nfl_map_mask.svg` - SVG overlay with 32 team regions

## Development

```bash
# Run linter
npm run lint

# Run automated tests
npm test

# Format code
npm run format

# Preview production build
npm run preview
```
