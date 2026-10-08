import { ConjugationModule } from '../modules/conjugation/ui/ConjugationModule.tsx';
import { ModeModule } from '../modules/mode/ui/ModeModule.tsx';
import { SentenceModule } from '../modules/sentences/ui/SentenceModule.tsx';
import { PhraseModule } from '../modules/phrases/ui/PhraseModule.tsx';
import { VocabModule } from '../modules/vocab/ui/VocabModule.tsx';
import { isTabRoute, MODULE_ROUTE, ROUTES, type TabRoute } from './routes.ts';
import { BookIcon, ChartIcon, InfoIcon } from './icons.tsx';
import { InfoPage } from './pages/InfoPage.tsx';
import { LearnPage } from './pages/LearnPage.tsx';
import { StatsPage } from './pages/StatsPage.tsx';
import { TabBar, type Tab } from './TabBar.tsx';
import { UpdatePrompt } from './UpdatePrompt.tsx';
import { useHashTab } from './useHashTab.ts';

const TAB_ITEMS: readonly Tab<TabRoute>[] = [
  { id: 'lernen', label: 'Lernen', icon: <BookIcon /> },
  { id: 'statistik', label: 'Statistik', icon: <ChartIcon /> },
  { id: 'info', label: 'Info', icon: <InfoIcon /> },
];

export function App() {
  const [route, setRoute] = useHashTab(ROUTES, 'lernen');
  const inModule = !isTabRoute(route);

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
        {route === 'saetze' && <SentenceModule onExit={() => setRoute('lernen')} />}
        {route === 'vokabeln' && <VocabModule onExit={() => setRoute('lernen')} />}
        {route === 'phrasen' && <PhraseModule onExit={() => setRoute('lernen')} />}
      </main>
      <UpdatePrompt />
      {!inModule && <TabBar tabs={TAB_ITEMS} current={route as TabRoute} onSelect={setRoute} />}
    </div>
  );
}
