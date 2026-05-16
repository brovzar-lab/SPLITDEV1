import { RD } from '../tokens';

interface Props {
  // Display labels (typically scene position numbers as strings)
  labels: string[];
  faded?: boolean;
  max?: number;
  onClick?: (index: number) => void;
}

export function SceneChips({ labels, faded, max = 3, onClick }: Props) {
  if (labels.length === 0) {
    return (
      <span
        style={{
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 10,
          color: RD.inkFade,
        }}
      >
        —
      </span>
    );
  }
  const shown = labels.slice(0, max);
  const overflow = Math.max(0, labels.length - max);
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 3,
        alignItems: 'center',
        opacity: faded ? 0.55 : 1,
      }}
    >
      {shown.map((label, i) => (
        <span
          key={`${label}-${i}`}
          onClick={onClick ? () => onClick(i) : undefined}
          style={{
            padding: '1px 5px',
            border: `1px solid ${RD.line}`,
            background: RD.paperDeep,
            fontFamily: RD.script,
            fontSize: 10.5,
            fontWeight: 700,
            color: RD.ink,
            fontVariantNumeric: 'tabular-nums',
            cursor: onClick ? 'pointer' : 'default',
            lineHeight: 1.3,
            borderRadius: 1,
          }}
        >
          {label}
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            fontFamily: RD.display,
            fontStyle: 'italic',
            fontSize: 10.5,
            color: RD.inkFade,
            marginLeft: 1,
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
