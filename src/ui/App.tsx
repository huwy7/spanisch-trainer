import { BookIcon, ChartIcon, InfoIcon } from './icons.tsx';
import { InfoPage } from './pages/InfoPage.tsx';
import { LearnPage } from './pages/LearnPage.tsx';
import { StatsPage } from './pages/StatsPage.tsx';
import { TabBar, type Tab } from './TabBar.tsx';
import { UpdatePrompt } from './UpdatePrompt.tsx';
import { useHashTab } from './useHashTab.ts';

const TABS = ['lernen', 'statistik', 'info'] as const;
type TabId = (typeof TABS)[number];

const TAB_ITEMS: readonly Tab<TabId>[] = [
  { id: 'lernen', label: 'Lernen', icon: <BookIcon /> },
  { id: 'statistik', label: 'Statistik', icon: <ChartIcon /> },
  { id: 'info', label: 'Info', icon: <InfoIcon /> },
];

export function App() {
  const [tab, setTab] = useHashTab(TABS, 'lernen');

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'lernen' && <LearnPage />}
        {tab === 'statistik' && <StatsPage />}
        {tab === 'info' && <InfoPage />}
      </main>
      <UpdatePrompt />
      <TabBar tabs={TAB_ITEMS} current={tab} onSelect={setTab} />
    </div>
  );
}
