import { DEFAULT_MAP_REGIONS, MapRegion } from './mapRegions';

export const REGION_STORAGE_KEY = 'nfl-conquest-map-regions';

export function loadStoredRegions(): MapRegion[] {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_MAP_REGIONS;
  }

  try {
    const stored = localStorage.getItem(REGION_STORAGE_KEY);
    if (!stored) return DEFAULT_MAP_REGIONS;
    const parsed = JSON.parse(stored) as MapRegion[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_MAP_REGIONS;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load stored map regions', error);
    return DEFAULT_MAP_REGIONS;
  }
}

export function persistRegions(regions: MapRegion[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(regions));
  } catch (error) {
    console.error('Failed to persist map regions', error);
  }
}

export function clearStoredRegions(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(REGION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear stored map regions', error);
  }
}
