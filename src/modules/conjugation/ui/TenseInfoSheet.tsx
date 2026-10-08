import { useState } from 'react';
import { Sheet } from '../../../ui/Sheet.tsx';
import { conjugationTable, type VerbLookup } from '../engine.ts';
import { MODEL_VERBS, TENSE_INFO } from '../tenseInfo.ts';
import { personLabel, TENSES, type TenseId } from '../tenses.ts';
import type { VerbEntry } from '../types.ts';

interface Props {
  tense: TenseId;
  lookup: VerbLookup;
  /** Verb of the current card; only passed after the answer is revealed (SPEC §3 K). */
  currentVerb?: VerbEntry;
  onClose: () => void;
}

export function TenseInfoSheet({ tense, lookup, currentVerb, onClose }: Props) {
  const info = TENSE_INFO[tense];
  const t = TENSES[tense];
  const names = [
    ...(currentVerb ? [currentVerb.inf] : []),
    ...MODEL_VERBS,
    info.irregularModel,
  ].filter((inf, i, all) => all.indexOf(inf) === i);
  const verbs = names.map(lookup).filter((v): v is VerbEntry => !!v);
  const [selected, setSelected] = useState(verbs[0]?.inf);
  const verb = verbs.find((v) => v.inf === selected) ?? verbs[0];

  return (
    <Sheet title={t.label} onClose={onClose}>
      <p className="sheet-level">
        <span className={`level level-${t.level}`}>{t.level}</span>
      </p>

      <h3 className="section-title">Verwendung</h3>
      <p>{info.use}</p>
      {info.signals && (
        <p className="muted" lang="es">
          Signalwörter: {info.signals}
        </p>
      )}

      <h3 className="section-title">Bildung</h3>
      <p>{info.formation}</p>

      {verb && (
        <>
          <div className="verb-tabs" role="tablist" aria-label="Beispielverb">
            {verbs.map((v) => (
              <button
                key={v.inf}
                type="button"
                role="tab"
                aria-selected={v.inf === verb.inf}
                className="chip"
                onClick={() => setSelected(v.inf)}
                lang="es"
              >
                {v.inf}
                {v.inf === currentVerb?.inf ? ' ★' : ''}
              </button>
            ))}
          </div>
          <p className="muted small">
            {verb.de.join(', ')}
            {verb.irregular ? ' · unregelmässig' : ''}
          </p>
          <table className="conj-table" lang="es">
            <tbody>
              {conjugationTable(verb, tense, lookup).map((row) => (
                <tr key={row.person}>
                  <th scope="row">{personLabel(row.person, tense)}</th>
                  <td>
                    {row.form}
                    {row.alternatives.length > 0 && (
                      <span className="muted"> / {row.alternatives.join(', ')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="section-title">Beispiele</h3>
      <ul className="example-list">
        {info.examples.map((ex) => (
          <li key={ex.es}>
            <span lang="es">{ex.es}</span>
            <span className="muted">{ex.de}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
