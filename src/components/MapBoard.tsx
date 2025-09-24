import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, TeamId } from '../state/types';
import { getPlayerTerritories } from '../logic/conquest';
import { NFL_TEAMS } from '../data/nflTeams';
import mapBase from '../assets/IMG_7333.png';
import { TeamGrid } from './TeamGrid';
import type { MapRegion } from '../data/mapRegions';
import { TEAM_LOGOS, TEAM_LOGOS_BW } from '../data/teamLogos';
import { PlayerLegend } from './PlayerLegend';

const MAP_WIDTH = 2688;
const MAP_HEIGHT = 1242;

const lightenColor = (hex: string, amount: number) => {
  const normalized = hex.replace('#', '');
  const num = parseInt(normalized, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

interface MapBoardProps {
  gameState: GameState;
  viewMode: 'map' | 'grid';
  selectedTeamId: TeamId | null;
  highlightPlayerId: string | null;
  regions: MapRegion[];
  isEditing: boolean;
  onSelectTeam: (teamId: TeamId | null) => void;
  onUpdateRegion: (teamId: TeamId, updates: Partial<MapRegion>) => void;
  onHighlightPlayer: (playerId: string | null) => void;
}

type TooltipState = {
  teamId: TeamId;
  teamLabel: string;
  ownerName?: string;
  ownerColor?: string;
  territoriesOwned: number;
  x: number;
  y: number;
};

type DragState = {
  teamId: TeamId;
  offsetX: number;
  offsetY: number;
};

export function MapBoard({
  gameState,
  viewMode,
  selectedTeamId,
  highlightPlayerId,
  regions,
  isEditing,
  onSelectTeam,
  onUpdateRegion,
  onHighlightPlayer,
}: MapBoardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const findRegion = useCallback(
    (teamId: TeamId) => regions.find((region) => region.id === teamId),
    [regions],
  );

  const toSvgCoords = useCallback((event: MouseEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    return { x, y };
  }, []);

  useEffect(() => {
    const handleWindowMouseUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('mouseleave', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('mouseleave', handleWindowMouseUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGCircleElement>, teamId: TeamId) => {
      if (!isEditing) return;
      const coords = toSvgCoords(event.nativeEvent);
      if (!coords) return;
      const region = findRegion(teamId);
      if (!region) return;
      dragStateRef.current = {
        teamId,
        offsetX: coords.x - region.cx,
        offsetY: coords.y - region.cy,
      };
      event.stopPropagation();
      event.preventDefault();
    },
    [findRegion, isEditing, toSvgCoords],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      if (!isEditing) return;
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const coords = toSvgCoords(event.nativeEvent);
      if (!coords) return;
      const newCx = coords.x - dragState.offsetX;
      const newCy = coords.y - dragState.offsetY;
      onUpdateRegion(dragState.teamId, {
        cx: Math.max(0, Math.min(MAP_WIDTH, Number(newCx.toFixed(1)))),
        cy: Math.max(0, Math.min(MAP_HEIGHT, Number(newCy.toFixed(1)))),
      });
      event.preventDefault();
    },
    [isEditing, onUpdateRegion, toSvgCoords],
  );

  const handleMouseUpCapture = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  const handleRegionClick = useCallback(
    (teamId: TeamId) => {
      if (isEditing) return;
      const nextSelection = selectedTeamId === teamId ? null : teamId;
      onSelectTeam(nextSelection);
    },
    [isEditing, onSelectTeam, selectedTeamId],
  );

  const handleMouseEnter = useCallback(
    (teamId: TeamId) => {
      if (isEditing) return;
      const region = findRegion(teamId);
      const teamMeta = NFL_TEAMS.find((team) => team.id === teamId);
      const ownerId = gameState.ownership[teamId];
      const owner = ownerId ? gameState.players.find((player) => player.id === ownerId) : undefined;
      const ownerTerritories = owner ? getPlayerTerritories(gameState, owner.id) : [];
      const container = containerRef.current;
      if (!region || !teamMeta || !container) return;
      const rect = container.getBoundingClientRect();
      const x = ((region.cx / MAP_WIDTH) * rect.width) + 12;
      const y = ((region.cy / MAP_HEIGHT) * rect.height) + 12;
      setTooltip({
        teamId,
        teamLabel: `${teamMeta.city} ${teamMeta.name}`,
        ownerName: owner?.name,
        ownerColor: owner?.color,
        territoriesOwned: ownerTerritories.length,
        x,
        y,
      });
    },
    [findRegion, gameState, isEditing],
  );

  const handleMouseLeave = useCallback(() => {
    if (isEditing) return;
    setTooltip(null);
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      setTooltip(null);
    }
  }, [isEditing]);

  if (viewMode === 'grid') {
    return (
      <TeamGrid
        gameState={gameState}
        selectedTeamId={selectedTeamId}
        highlightPlayerId={highlightPlayerId}
        onSelectTeam={(teamId) => onSelectTeam(teamId)}
      />
    );
  }

  return (
    <div className="map-board">
      <div className="map-container" ref={containerRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className={`map-overlay-svg ${isEditing ? 'editing' : ''}`}
          onMouseMove={handleMouseMove}
          onMouseUpCapture={handleMouseUpCapture}
        >
          <image href={mapBase} width={MAP_WIDTH} height={MAP_HEIGHT} preserveAspectRatio="xMidYMid meet" />
          <defs>
            <filter id="markerShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.35)" />
            </filter>
            {regions.map((region) => (
              <clipPath key={`clip-${region.id}`} id={`clip-${region.id}`}>
                <circle cx={region.cx} cy={region.cy} r={region.radius - 8} />
              </clipPath>
            ))}
          </defs>
          {regions.map((region) => {
            const ownerId = gameState.ownership[region.id];
            const owner = ownerId ? gameState.players.find((player) => player.id === ownerId) : undefined;
            const isSelected = selectedTeamId === region.id;
            const matchesHighlight = highlightPlayerId ? owner?.id === highlightPlayerId : true;

            const fillOpacity = owner
              ? isSelected
                ? 0.98
                : matchesHighlight
                  ? 0.9
                  : 0.68
              : 0.6;

            const fillColor = owner
              ? lightenColor(owner.color, 0.35)
              : 'rgba(12, 16, 24, 0.92)';
            const strokeColor = owner
              ? owner.color
              : 'rgba(230, 234, 246, 0.85)';
            const strokeWidth = owner ? 10 : 5;
            const strokeDasharray = owner ? undefined : '6 8';

            const logoSrc = owner
              ? TEAM_LOGOS[region.id] ?? TEAM_LOGOS_BW[region.id]
              : TEAM_LOGOS_BW[region.id] ?? TEAM_LOGOS[region.id];
            const iconSize = region.radius * 1.4;
            const iconX = region.cx - iconSize / 2;
            const iconY = region.cy - iconSize / 2;

            return (
              <g key={region.id}>
                <circle
                  cx={region.cx}
                  cy={region.cy}
                  r={region.radius}
                  fill={fillColor}
                  fillOpacity={fillOpacity}
                  stroke={isSelected ? '#FFFFFF' : strokeColor}
                  strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  onMouseDown={(event) => handleMouseDown(event, region.id)}
                  onMouseEnter={() => handleMouseEnter(region.id)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleRegionClick(region.id)}
                  style={{ cursor: isEditing ? 'grab' : 'pointer' }}
                  filter="url(#markerShadow)"
                />
                {logoSrc && (
                  <image
                    href={logoSrc}
                    x={iconX}
                    y={iconY}
                    width={iconSize}
                    height={iconSize}
                    clipPath={`url(#clip-${region.id})`}
                    style={{ pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                  />
                )}
              </g>
            );
          })}
        </svg>
        <PlayerLegend
          gameState={gameState}
          highlightPlayerId={highlightPlayerId}
          onHighlight={onHighlightPlayer}
        />
        {tooltip && (
          <div
            className="map-tooltip"
            style={{ left: tooltip.x, top: tooltip.y, borderColor: tooltip.ownerColor ?? '#666' }}
          >
            <div className="map-tooltip-team">{tooltip.teamLabel}</div>
            <div className="map-tooltip-owner">
              {tooltip.ownerName ? (
                <>
                  <span className="color-dot" style={{ backgroundColor: tooltip.ownerColor ?? '#777' }} />
                  {tooltip.ownerName}
                </>
              ) : (
                'Volné území'
              )}
            </div>
            {tooltip.ownerName && (
              <div className="map-tooltip-meta">Území: {tooltip.territoriesOwned}</div>
            )}
          </div>
        )}
      </div>
      {isEditing && (
        <p className="map-board-hint">
          TIP: soubor `nfl_map_mask_template.svg` slouží jako podklad pro kreslení vlastních hranic.
        </p>
      )}
    </div>
  );
}
