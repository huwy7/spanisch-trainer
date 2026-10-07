const CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'];

interface Props {
  onInsert: (char: string) => void;
}

/** Ñ/accent helper bar (SPEC §3). Buttons keep the keyboard open (no focus change). */
export function AccentBar({ onInsert }: Props) {
  return (
    <div className="accent-bar" role="toolbar" aria-label="Sonderzeichen">
      {CHARS.map((c) => (
        <button
          key={c}
          type="button"
          className="accent-key"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onInsert(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
