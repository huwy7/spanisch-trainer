import { ConjugationModule } from '../modules/conjugation/ui/ConjugationModule.tsx';
import { ModeModule } from '../modules/mode/ui/ModeModule.tsx';
import type { ModuleId } from '../modules/registry.ts';
import { BookIcon, ChartIcon, InfoIcon } from './icons.tsx';
import { InfoPage } from './pages/InfoPage.tsx';
import { LearnPage } from './pages/LearnPage.tsx';
import { StatsPage } from './pages/StatsPage.tsx';
import { TabBar, type Tab } from './TabBar.tsx';
import { UpdatePrompt } from './UpdatePrompt.tsx';
import { useHashTab } from './useHashTab.ts';

const ROUTES = ['lernen', 'statistik', 'info', 'konjugation', 'modus'] as const;
type Route = (typeof ROUTES)[number];
type TabId = Exclude<Route, 'konjugation' | 'modus'>;

const TAB_ITEMS: readonly Tab<TabId>[] = [
  { id: 'lernen', label: 'Lernen', icon: <BookIcon /> },
  { id: 'statistik', label: 'Statistik', icon: <ChartIcon /> },
  { id: 'info', label: 'Info', icon: <InfoIcon /> },
];

const MODULE_ROUTE: Partial<Record<ModuleId, Route>> = { K: 'konjugation', M: 'modus' };

export function App() {
  const [route, setRoute] = useHashTab(ROUTES, 'lernen');
  const inModule = route === 'konjugation' || route === 'modus';

  return (
    <div className="app">
      <main className={inModule ? 'app-main app-main-module' : 'app-main'}>
        {route === 'lernen' && (
          <LearnPage onOpen={(id) => MODULE_ROUTE[id] && setRoute(MODULE_ROUTE[id])} />
        )}
        {route === 'statistik' && <StatsPage />}
        {route === 'info' && <InfoPage />}
        {route === 'konjugation' && <ConjugationModule onExit={() => setRoute('lernen')} />}
        {route === 'modus' && <ModeModule onExit={() => setRoute('lernen')} />}
      </main>
      <UpdatePrompt />
      {!inModule && <TabBar tabs={TAB_ITEMS} current={route as TabId} onSelect={setRoute} />}
    </div>
  );
}
