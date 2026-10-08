import { useState } from 'react';

interface Props {
  /** Accessible name of the chart (also the caption of its table view). */
  title: string;
  values: readonly number[];
  /** Axis label per bar ('' for none). */
  axis: readonly string[];
  /** Full description of one bar, shown when it is tapped. */
  describe: (i: number) => string;
  /** Value labels: on every bar, or only on the highest and the last bar. */
  labels: 'all' | 'peak';
}

/**
 * Single-series bar chart in plain HTML: thin rounded bars on a baseline, selective value
 * labels, tap for details, and a table view for screen readers.
 */
export function BarChart({ title, values, axis, describe, labels }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  const showValue = (i: number) =>
    values[i]! > 0 && (labels === 'all' || i === peak || i === values.length - 1);

  return (
    <figure className="bar-chart">
      <p className="bar-chart-readout" aria-live="polite">
        {selected === null ? 'Balken antippen für Details' : describe(selected)}
      </p>
      <div className="bar-chart-plot" aria-hidden="true">
        {values.map((v, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className="bar-chart-col"
            aria-pressed={selected === i}
            onClick={() => setSelected(selected === i ? null : i)}
          >
            {showValue(i) && <span className="bar-chart-value">{v}</span>}
            <span
              className="bar-chart-bar"
              style={{ height: `calc((100% - 16px) * ${v / max})` }}
            />
          </button>
        ))}
      </div>
      <div className="bar-chart-axis" aria-hidden="true">
        {axis.map((a, i) => (
          <span key={i}>{a}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {values.map((_, i) => (
            <tr key={i}>
              <td>{describe(i)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
