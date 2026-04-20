import { useId, useState } from 'react';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  thickness?: number;
  emptyLabel?: string;
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  className?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = Math.min(endAngle - startAngle, 359.99);
  const end = startAngle + sweep;
  const largeArc = sweep > 180 ? 1 : 0;

  const s = polarToCartesian(cx, cy, outerR, startAngle);
  const e = polarToCartesian(cx, cy, outerR, end);
  const si = polarToCartesian(cx, cy, innerR, end);
  const ei = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${s.x} ${s.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    `L ${si.x} ${si.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ei.x} ${ei.y}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 176,
  thickness = 20,
  emptyLabel = 'No data',
  valueFormatter = (v) => v.toFixed(0),
  showLegend = true,
  className = '',
}: DonutChartProps) {
  const uid = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const normalized = segments
    .map((s) => ({ ...s, value: Number.isFinite(s.value) ? Math.max(0, s.value) : 0 }))
    .filter((s) => s.value > 0);

  const total = normalized.reduce((sum, s) => sum + s.value, 0);

  const cx = size / 2;
  const cy = size / 2;
  const POP = 6;
  const GLOW_GROW = 3;
  const padding = POP + GLOW_GROW + 2;
  const outerR = (size - padding * 2) / 2;
  const innerR = outerR - thickness;
  const GAP_DEG = normalized.length > 1 ? 1.5 : 0;

  const labelFontSize = Math.max(8, Math.round(size * 0.065));
  const valueFontSize = Math.max(10, Math.round(size * 0.08));

  let cursor = 0;
  const arcs = normalized.map((seg, i) => {
    const sweep = (seg.value / total) * 360;
    const start = cursor + GAP_DEG / 2;
    const end = cursor + sweep - GAP_DEG / 2;
    const mid = cursor + sweep / 2;
    cursor += sweep;
    return { seg, i, start, end, mid };
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltipPos(null);
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            {normalized.map((seg, i) => {
              const id = `${uid}-glow-${i}`;
              return (
                <filter key={id} id={id} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feFlood floodColor={seg.color} floodOpacity="0.6" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              );
            })}
          </defs>

          {total === 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="#2A2F38"
              strokeWidth={thickness}
            />
          )}

          {arcs.map(({ seg, i, start, end, mid }) => {
            const isHovered = hoveredIdx === i;
            const midRad = ((mid - 90) * Math.PI) / 180;
            const tx = isHovered ? POP * Math.cos(midRad) : 0;
            const ty = isHovered ? POP * Math.sin(midRad) : 0;
            const ro = isHovered ? outerR + GLOW_GROW : outerR;

            return (
              <path
                key={i}
                d={describeArc(cx, cy, ro, innerR, start, end)}
                fill={seg.color}
                opacity={hoveredIdx !== null && !isHovered ? 0.45 : 1}
                filter={isHovered ? `url(#${uid}-glow-${i})` : undefined}
                style={{
                  transform: `translate(${tx}px, ${ty}px)`,
                  transition: 'transform 0.18s ease, opacity 0.18s ease, filter 0.18s ease',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
              />
            );
          })}

          {centerLabel && total > 0 && (
            <text
              x={cx}
              y={cy - labelFontSize * 0.7}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#64748b"
              style={{
                fontSize: labelFontSize,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: 'inherit',
              }}
            >
              {centerLabel}
            </text>
          )}
          <text
            x={cx}
            y={centerLabel && total > 0 ? cy + valueFontSize * 0.85 : cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f1f5f9"
            style={{ fontSize: valueFontSize, fontWeight: 700, fontFamily: 'inherit' }}
          >
            {total > 0 ? centerValue : emptyLabel}
          </text>
        </svg>

        {tooltipPos && hoveredIdx !== null && normalized[hoveredIdx] && (
          <div
            style={{
              position: 'fixed',
              left: tooltipPos.x + 16,
              top: tooltipPos.y - 42,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            className="flex items-center gap-2 bg-[#1F2630] border border-[#2A2F38] rounded-xl px-3 py-2 shadow-2xl"
          >
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: normalized[hoveredIdx].color }}
            />
            <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
              {normalized[hoveredIdx].label}
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {valueFormatter(normalized[hoveredIdx].value)}
              &nbsp;·&nbsp;
              {((normalized[hoveredIdx].value / total) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {showLegend && (
        <div className="w-full space-y-1.5">
          {(total > 0 ? normalized : segments).map((seg, i) => {
            const pct = total > 0 ? (seg.value / total) * 100 : 0;
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={seg.label}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-0.5 cursor-pointer"
                style={{
                  opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
                  backgroundColor: isHovered ? '#2A2F38' : 'transparent',
                  transition: 'opacity 0.15s ease, background-color 0.15s ease',
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-slate-500 shrink-0 w-4 text-right tabular-nums">
                    {i + 1}.
                  </span>
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-xs text-slate-300 truncate">{seg.label}</span>
                </div>
                <div className="text-xs text-slate-400 shrink-0 tabular-nums">
                  {valueFormatter(seg.value)}&nbsp;·&nbsp;{pct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
