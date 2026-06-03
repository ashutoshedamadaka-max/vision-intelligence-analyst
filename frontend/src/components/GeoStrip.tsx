interface Props {
  filename?: string;
  capturedAt?: string;
}

function utcNow(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

export function GeoStrip({ filename, capturedAt }: Props) {
  const cells = [
    { k: 'Platform', v: 'WV-3 / SAT' },
    { k: 'Sensor', v: 'EO · PAN' },
    { k: 'GSD', v: '0.31 m' },
    { k: 'Collected', v: capturedAt ?? utcNow() },
    { k: 'Location', v: '34.0522°N 118.244°W' },
    { k: 'MGRS', v: '11SLT 8472 3915' },
    { k: 'Source', v: filename ?? '—' },
  ];

  return (
    <div
      className="flex flex-wrap border rounded-lg overflow-hidden mb-4"
      style={{ borderColor: 'rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)' }}
    >
      {cells.map((c, i) => (
        <div
          key={c.k}
          className="px-3 py-2 flex-1 min-w-[110px]"
          style={{ borderRight: i < cells.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}
        >
          <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase" style={{ color: 'oklch(0.45 0.004 240)' }}>
            {c.k}
          </div>
          <div className="font-mono text-[12px] mt-0.5 truncate" style={{ color: 'oklch(0.92 0.005 240)' }}>
            {c.v}
          </div>
        </div>
      ))}
    </div>
  );
}
