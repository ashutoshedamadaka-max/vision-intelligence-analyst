import type { Provenance } from '@/lib/types';

interface Props {
  provenance: Provenance;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-2.5 py-1.5 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-0)]">
      <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-medium">
        {label}
      </span>
      <span className="text-xs text-[color:var(--color-text-subtle)] truncate max-w-[120px]">
        {value}
      </span>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso)
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, ' UTC');
  } catch {
    return iso;
  }
}

export function ProvenanceTag({ provenance }: Props) {
  const filename =
    provenance.sourceFile.length > 22
      ? `…${provenance.sourceFile.slice(-18)}`
      : provenance.sourceFile;

  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip label="Source" value={filename} />
      <Chip label="Time" value={formatTimestamp(provenance.timestamp)} />
      <Chip label="Sensor" value={provenance.sensorType} />
      <Chip label="Model" value={provenance.modelVersion} />
    </div>
  );
}
