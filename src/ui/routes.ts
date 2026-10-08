import type { ModuleId } from '../modules/registry.ts';

/** Hash routes: tabs plus one route per module (shown without the tab bar). */
export const TAB_ROUTES = ['lernen', 'statistik', 'info'] as const;
export const ROUTES = [...TAB_ROUTES, 'konjugation', 'modus', 'saetze', 'vokabeln'] as const;
export type Route = (typeof ROUTES)[number];
export type TabRoute = (typeof TAB_ROUTES)[number];

export const MODULE_ROUTE: Partial<Record<ModuleId, Route>> = {
  K: 'konjugation',
  M: 'modus',
  S: 'saetze',
  V: 'vokabeln',
};

export const isTabRoute = (r: Route): r is TabRoute =>
  (TAB_ROUTES as readonly string[]).includes(r);
