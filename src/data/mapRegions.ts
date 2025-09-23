import defaultRegions from './defaultMapRegions.json';
import { TeamId } from '../state/types';

export type MapRegion = {
  id: TeamId;
  cx: number;
  cy: number;
  radius: number;
};

export const DEFAULT_MAP_REGIONS: MapRegion[] = defaultRegions as MapRegion[];
