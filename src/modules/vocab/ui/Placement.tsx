import { useRef, useState, type PointerEvent } from 'react';
import { db } from '../../../db/db.ts';
import { markKnown } from '../../../db/progress.ts';
import { updateSetting } from '../../../ui/useSettings.ts';
import {
  blockOf,
  BLOCK_SIZE,
  genderLabel,
  isBlockEnd,
  posLabel,
  suggestStop,
  swipeDecision,
  type Decision,
} from '../placement.ts';
import { vocabCardId, type VocabEntry } from '../types.ts';

interface Props {
  words: VocabEntry[];
  startIndex: number;
  onFinish: () => void;
}

/**
 * SPEC §3 V: placement in blocks of 50. Swipe right = "kenne ich" (marked as learned),
 * left = "kenne ich nicht" (stays new). Buttons for the same in thumb reach.
 */
export function Placement({ words, startIndex, onFinish }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [knownInBlock, setKnownInBlock] = useState(0);
  const [blockDone, setBlockDone] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const word = words[index];

  const finish = async () => {
    await updateSetting('vocabPlacementDone', true);
    onFinish();
  };

  // one decision at a time: fast double taps must not hit the same word twice
  const pending = useRef(false);
  const decide = async (d: Decision) => {
    if (!word || pending.current) return;
    pending.current = true;
    try {
      await applyDecision(d, word);
    } finally {
      pending.current = false;
    }
  };

  const applyDecision = async (d: Decision, word: VocabEntry) => {
    if (d === 'known') await markKnown(db(), [vocabCardId(word.lemma)], 'V', Date.now());
    const next = index + 1;
    await updateSetting('vocabPlacementIndex', next);
    setKnownInBlock((k) => k + (d === 'known' ? 1 : 0));
    setIndex(next);
    setShowMeaning(false);
    setDx(0);
    if (next >= words.length) await finish();
    else if (isBlockEnd(next)) setBlockDone(true);
  };

  const onDown = (e: PointerEvent) => {
    start.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (start.current !== null) setDx(e.clientX - start.current);
  };
  const onUp = () => {
    const d = swipeDecision(dx);
    start.current = null;
    if (d) void decide(d);
    else setDx(0);
  };

  if (blockDone) {
    const stop = suggestStop(knownInBlock);
    return (
      <div className="card-stage">
        <div className="empty-state">
          <h2>Block {blockOf(index - 1).block} geschafft</h2>
          <p className="muted">
            {knownInBlock} von {BLOCK_SIZE} Wörtern kanntest du.
            {stop
              ? ' Die nächsten Wörter sind seltener – du kannst die Einstufung hier beenden und die restlichen Wörter normal lernen.'
              : ' Weiter mit den nächsten 50 Wörtern?'}
          </p>
        </div>
        <div className="action-bar">
          <button
            type="button"
            className={`btn ${stop ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => void finish()}
          >
            Einstufung beenden
          </button>
          <button
            type="button"
            className={`btn ${stop ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => {
              setBlockDone(false);
              setKnownInBlock(0);
            }}
          >
            Nächster Block
          </button>
        </div>
      </div>
    );
  }

  if (!word) return null;
  const { block, position } = blockOf(index);
  const hint = dx > 30 ? 'known' : dx < -30 ? 'unknown' : null;

  return (
    <div className="card-stage">
      <p className="muted small placement-progress">
        Einstufung · Block {block} · {position}/{BLOCK_SIZE} · Wort #{word.rank}
      </p>
      <div
        className={`prompt swipe-card ${hint ? `swipe-${hint}` : ''}`}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setDx(0)}
        role="group"
        aria-label={`Kennst du ${word.lemma}?`}
      >
        <div className="prompt-meta">
          <span>{posLabel(word.pos)}</span>
          {word.gender && <span className="tag">{genderLabel(word.gender)}</span>}
        </div>
        <div className="prompt-verb" lang="es">
          {word.lemma}
        </div>
        {showMeaning ? (
          <div className="prompt-meaning">{word.de.join(', ')}</div>
        ) : (
          <button
            type="button"
            className="btn-link"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowMeaning(true)}
          >
            Bedeutung zeigen
          </button>
        )}
        <p className="muted small">← kenne ich nicht · kenne ich →</p>
      </div>
      <div className="action-bar">
        <button
          type="button"
          className="btn btn-rate btn-again"
          onClick={() => void decide('unknown')}
        >
          Kenne ich nicht
        </button>
        <button
          type="button"
          className="btn btn-rate btn-good"
          onClick={() => void decide('known')}
        >
          Kenne ich
        </button>
      </div>
      <button type="button" className="btn-link placement-stop" onClick={() => void finish()}>
        Einstufung beenden
      </button>
    </div>
  );
}
