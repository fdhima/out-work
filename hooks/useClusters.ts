import { useMemo } from 'react';
import Supercluster from 'supercluster';
import { Region } from 'react-native-maps';
import { PlaceEnhanced } from '@/services/places';

export type ClusterPoint = {
  type: 'cluster';
  id: number;
  latitude: number;
  longitude: number;
  count: number;
  expansionZoom: number;
};

export type SinglePoint = {
  type: 'point';
  place: PlaceEnhanced;
};

export type MapPoint = ClusterPoint | SinglePoint;

const MIN_ZOOM = 0;
const MAX_ZOOM = 16;

function isValidRegion(region: Region): boolean {
  const { longitude, latitude, longitudeDelta, latitudeDelta } = region;
  return (
    isFinite(longitude) &&
    isFinite(latitude) &&
    isFinite(longitudeDelta) &&
    isFinite(latitudeDelta) &&
    longitudeDelta > 0 &&
    latitudeDelta > 0
  );
}

function regionToZoom(region: Region): number {
  const raw = Math.log2(360 / Math.min(region.longitudeDelta, 360));
  return Math.round(Math.max(MIN_ZOOM, Math.min(raw, MAX_ZOOM)));
}

export function useClusters(places: PlaceEnhanced[], region: Region | null): MapPoint[] {
  // Rebuild the supercluster index only when places change
  const sc = useMemo(() => {
    const instance = new Supercluster<{ place: PlaceEnhanced }>({
      radius: 60,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    const points: Supercluster.PointFeature<{ place: PlaceEnhanced }>[] = places.map(place => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [place.longitude, place.latitude] },
      properties: { place },
    }));
    instance.load(points);
    return instance;
  }, [places]);

  // Recompute clusters when region changes
  return useMemo(() => {
    if (!region || places.length === 0) return [];
    if (!isValidRegion(region)) return [];

    try {
      const zoom = regionToZoom(region);
      const bbox: [number, number, number, number] = [
        Math.max(-180, region.longitude - region.longitudeDelta / 2),
        Math.max(-85.051129, region.latitude - region.latitudeDelta / 2),
        Math.min(180, region.longitude + region.longitudeDelta / 2),
        Math.min(85.051129, region.latitude + region.latitudeDelta / 2),
      ];

      // Ensure bbox is valid (min < max on both axes)
      if (bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) return [];

      return sc.getClusters(bbox, zoom).filter(item => {
        const [lng, lat] = item.geometry.coordinates;
        return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      }).map(item => {
        if (item.properties.cluster) {
          const clusterId = item.properties.cluster_id as number;
          return {
            type: 'cluster',
            id: clusterId,
            latitude: item.geometry.coordinates[1],
            longitude: item.geometry.coordinates[0],
            count: item.properties.point_count as number,
            expansionZoom: sc.getClusterExpansionZoom(clusterId),
          } satisfies ClusterPoint;
        }
        return {
          type: 'point',
          place: (item.properties as unknown as { place: PlaceEnhanced }).place,
        } satisfies SinglePoint;
      });
    } catch {
      return [];
    }
  }, [sc, region]);
}
