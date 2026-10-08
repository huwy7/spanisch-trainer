export type ModuleId = 'K' | 'M' | 'S' | 'V' | 'P';

export interface ModuleInfo {
  id: ModuleId;
  title: string;
  description: string;
  /** Milestone in SPEC §8 that delivers the module. */
  milestone: string;
  available: boolean;
}

export const MODULES: readonly ModuleInfo[] = [
  {
    id: 'K',
    title: 'Konjugation',
    description: 'Verben in allen Zeitformen konjugieren',
    milestone: 'M1',
    available: true,
  },
  {
    id: 'M',
    title: 'Modus wählen',
    description: 'Indikativ oder Subjuntivo?',
    milestone: 'M2',
    available: true,
  },
  {
    id: 'S',
    title: 'Satzkarten',
    description: 'Ganze Sätze übersetzen',
    milestone: 'M3',
    available: true,
  },
  {
    id: 'V',
    title: 'Vokabeln',
    description: 'Die häufigsten Wörter',
    milestone: 'M4',
    available: true,
  },
  {
    id: 'P',
    title: 'Phrasen',
    description: 'Smalltalk, Höflichkeit, Umgangssprache',
    milestone: 'M5',
    available: true,
  },
];
