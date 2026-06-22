import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { SectorListItem, SectorsResponse } from '../../types/api';

/** Loads the sector list once for filter dropdowns. Non-fatal on error. */
export function useSectors(): SectorListItem[] {
  const [sectors, setSectors] = useState<SectorListItem[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get<SectorsResponse>('/sectors', { signal: ctrl.signal })
      .then((res) => setSectors(res.items))
      .catch(() => {
        /* dropdown is optional; ignore */
      });
    return () => ctrl.abort();
  }, []);
  return sectors;
}
