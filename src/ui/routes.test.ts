import { describe, expect, it } from 'vitest';
import { MODULES } from '../modules/registry.ts';
import { MODULE_ROUTE, ROUTES } from './routes.ts';

describe('routes', () => {
  it('every available module can be opened', () => {
    for (const m of MODULES.filter((x) => x.available)) {
      expect(MODULE_ROUTE[m.id], m.id).toBeDefined();
      expect(ROUTES).toContain(MODULE_ROUTE[m.id]);
    }
  });
});
