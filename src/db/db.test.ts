import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  backupDue,
  backupFileName,
  BackupError,
  exportBackup,
  importBackup,
  parseBackup,
} from './backup.ts';
import { AppDB } from './db.ts';
import { countNewToday, loadStates, markKnown, recordAnswer, startOfDay } from './progress.ts';
import { DEFAULT_SETTINGS, loadSettings, saveSetting } from './settings.ts';

const NOW = new Date(2026, 9, 7, 15).getTime();
let n = 0;
const dbs: AppDB[] = [];
const freshDb = () => {
  const d = new AppDB(`test-${n++}`);
  dbs.push(d);
  return d;
};
afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete();
});

describe('progress', () => {
  it('records an answer: card state and review log in one step', async () => {
    const db = freshDb();
    const s = await recordAnswer(db, {
      cardId: 'tener:pres:1s',
      module: 'K',
      answer: 'good',
      prev: undefined,
      now: NOW,
      durationMs: 3200.4,
    });
    expect((await loadStates(db, 'K')).get('tener:pres:1s')).toEqual(s);
    const [log] = await db.reviews.toArray();
    expect(log).toMatchObject({
      cardId: 'tener:pres:1s',
      module: 'K',
      answer: 'good',
      ts: NOW,
      durationMs: 3200,
      wasNew: true,
    });
  });

  it('counts new cards introduced today only', async () => {
    const db = freshDb();
    const s = await recordAnswer(db, {
      cardId: 'a',
      module: 'K',
      answer: 'good',
      prev: undefined,
      now: NOW,
      durationMs: 1,
    });
    await recordAnswer(db, {
      cardId: 'a',
      module: 'K',
      answer: 'good',
      prev: s,
      now: NOW + 1,
      durationMs: 1,
    });
    await recordAnswer(db, {
      cardId: 'b',
      module: 'K',
      answer: 'again',
      prev: undefined,
      now: NOW - 86_400_000,
      durationMs: 1,
    });
    await recordAnswer(db, {
      cardId: 'c',
      module: 'M',
      answer: 'good',
      prev: undefined,
      now: NOW,
      durationMs: 1,
    });
    expect(await countNewToday(db, 'K', NOW)).toBe(1);
    expect(await countNewToday(db, null, NOW)).toBe(2);
    expect([...(await loadStates(db, null)).keys()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('starts the day at local midnight', () => {
    expect(new Date(startOfDay(NOW)).getHours()).toBe(0);
  });
});

describe('markKnown (placement)', () => {
  it('creates learned card states without review-log entries and keeps existing progress', async () => {
    const db = freshDb();
    const prev = await recordAnswer(db, {
      cardId: 'v:casa',
      module: 'V',
      answer: 'again',
      prev: undefined,
      now: NOW,
      durationMs: 1,
    });
    expect(await markKnown(db, ['v:casa', 'v:perro', 'v:gato'], 'V', NOW)).toBe(2);
    const states = await loadStates(db, 'V');
    expect(states.get('v:casa')).toEqual(prev);
    expect(states.get('v:perro')!.reps).toBe(1);
    expect(states.get('v:perro')!.due).toBeGreaterThan(NOW + 86_400_000);
    expect(await db.reviews.count()).toBe(1);
    expect(await countNewToday(db, 'V', NOW)).toBe(1);
  });
});

describe('settings', () => {
  it('returns defaults and stored values', async () => {
    const db = freshDb();
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
    await saveSetting(db, 'newPerDay', 50);
    expect((await loadSettings(db)).newPerDay).toBe(50);
  });
});

describe('backup', () => {
  it('round-trips all progress into another database', async () => {
    const a = freshDb();
    const s = await recordAnswer(a, {
      cardId: 'tener:pres:1s',
      module: 'K',
      answer: 'easy',
      prev: undefined,
      now: NOW,
      durationMs: 5,
    });
    await saveSetting(a, 'answerMode', 'type');
    const text = JSON.stringify(await exportBackup(a, NOW));

    const b = freshDb();
    await recordAnswer(b, {
      cardId: 'other',
      module: 'K',
      answer: 'good',
      prev: undefined,
      now: NOW,
      durationMs: 5,
    });
    await importBackup(b, parseBackup(text));

    expect([...(await loadStates(b, 'K'))]).toEqual([['tener:pres:1s', s]]);
    expect(await b.reviews.count()).toBe(1);
    expect((await loadSettings(b)).answerMode).toBe('type');
  });

  it('rejects files that are not a valid backup', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"other"}')).toThrow('kein Backup dieser App');
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: 'spanisch-trainer',
          schema: 99,
          cards: [],
          reviews: [],
          settings: [],
        }),
      ),
    ).toThrow('neueren App-Version');
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: 'spanisch-trainer',
          schema: 1,
          cards: [{ id: 1 }],
          reviews: [],
          settings: [],
        }),
      ),
    ).toThrow('ungültige Karten');
  });

  it('names files by date and reminds after 7 days', () => {
    expect(backupFileName(new Date('2026-10-07T10:00:00Z'))).toBe(
      'spanisch-trainer-backup-2026-10-07.json',
    );
    const day = 86_400_000;
    expect(backupDue(null, null, NOW)).toBe(false);
    expect(backupDue(NOW - 8 * day, null, NOW)).toBe(true);
    expect(backupDue(NOW - 6 * day, null, NOW)).toBe(false);
    expect(backupDue(null, NOW - 8 * day, NOW)).toBe(true);
  });
});
