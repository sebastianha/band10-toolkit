import type { DataSourceKey, WatchFaceWidget } from '../../../core/types.ts'
import { DATA_SOURCES } from '../../../core/dataSources.ts'

interface InspectorProps {
  widget?: WatchFaceWidget
  digitSets: string[]
  sources: DataSourceKey[]
  onChange: (patch: Partial<WatchFaceWidget>) => void
  onDelete: () => void
  onDuplicate: () => void
}

function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className="field"><span>{label}</span><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function Inspector({ widget, digitSets, sources, onChange, onDelete, onDuplicate }: InspectorProps) {
  if (!widget) {
    return <section className="nothing-selected"><div className="selection-glyph">⌖</div><h2>Select a widget</h2><p>Click an element on the display or choose a layer to inspect its Band 10 properties.</p></section>
  }
  const source = 'source' in widget ? widget.source : undefined
  return (
    <section className="inspector">
      <div className="section-heading">
        <div><span className="eyebrow">{widget.type}</span><h2>{widget.label || widget.id}</h2></div>
        <span className="z-pill">z {widget.z}</span>
      </div>
      <div className="field-section">
        <h3>Identity</h3>
        <label className="field"><span>ID</span><input value={widget.id} onChange={(event) => onChange({ id: event.target.value })} /></label>
        <label className="field"><span>Label</span><input value={widget.label ?? ''} placeholder="Optional label" onChange={(event) => onChange({ label: event.target.value || undefined })} /></label>
      </div>
      <div className="field-section">
        <h3>Position</h3>
        <div className="field-row"><NumberField label="X" value={widget.x} min={-999} max={999} onChange={(x) => onChange({ x })} /><NumberField label="Y" value={widget.y} min={-999} max={999} onChange={(y) => onChange({ y })} /></div>
        <NumberField label="Layer" value={widget.z} min={0} onChange={(z) => onChange({ z })} />
      </div>
      <div className="field-section">
        <h3>Appearance</h3>
        <label className="range-field"><span>Opacity <strong>{Math.round((widget.opacity ?? 1) * 100)}%</strong></span><input type="range" min="0" max="1" step="0.01" value={widget.opacity ?? 1} onChange={(event) => onChange({ opacity: Number(event.target.value) })} /></label>
        <div className="toggle-row"><span>Visible</span><button className={`toggle ${widget.visible === false ? '' : 'on'}`} onClick={() => onChange({ visible: widget.visible === false })}><i /></button></div>
        <div className="toggle-row"><span>Lock position</span><button className={`toggle ${widget.locked ? 'on' : ''}`} onClick={() => onChange({ locked: !widget.locked })}><i /></button></div>
        <div className="toggle-row"><span>Intentional overlap</span><button className={`toggle ${widget.allowOverlap ? 'on' : ''}`} onClick={() => onChange({ allowOverlap: !widget.allowOverlap })}><i /></button></div>
      </div>
      {source && (
        <div className="field-section">
          <h3>Data binding</h3>
          <label className="field"><span>Source</span><select value={source} onChange={(event) => onChange({ source: event.target.value as DataSourceKey })}>{sources.map((key) => <option key={key} value={key}>{DATA_SOURCES[key].label}</option>)}</select></label>
          <div className="binding-code"><span>FPRJ</span><code>{DATA_SOURCES[source].fprjId}</code></div>
        </div>
      )}
      {widget.type === 'number' && (
        <div className="field-section">
          <h3>Digital number</h3>
          <label className="field"><span>Digit set</span><select value={widget.digitSet} onChange={(event) => onChange({ digitSet: event.target.value })}>{digitSets.map((set) => <option key={set}>{set}</option>)}</select></label>
          <div className="field-row"><NumberField label="Digits" value={widget.digits} min={1} max={40} onChange={(digits) => onChange({ digits })} /><NumberField label="Spacing" value={widget.spacing ?? 0} min={-99} max={99} onChange={(spacing) => onChange({ spacing })} /></div>
          <label className="field"><span>Alignment</span><select value={widget.align} onChange={(event) => onChange({ align: event.target.value as 'left' | 'center' | 'right' })}><option>left</option><option>center</option><option>right</option></select></label>
          <div className="toggle-row"><span>Leading zero</span><button className={`toggle ${widget.leadingZero ? 'on' : ''}`} onClick={() => onChange({ leadingZero: !widget.leadingZero })}><i /></button></div>
        </div>
      )}
      {widget.type === 'progress' && (
        <div className="field-section">
          <h3>Progress</h3>
          <label className="field"><span>Shape</span><select value={widget.shape} onChange={(event) => onChange({ shape: event.target.value as 'bar' | 'arc' })}><option>bar</option><option>arc</option></select></label>
          <div className="field-row"><NumberField label="Width" value={widget.width} min={1} max={212} onChange={(width) => onChange({ width })} /><NumberField label="Height" value={widget.height} min={1} max={520} onChange={(height) => onChange({ height })} /></div>
          <div className="field-row"><NumberField label="Maximum" value={widget.maximum} min={1} onChange={(maximum) => onChange({ maximum })} /><NumberField label="Thickness" value={widget.thickness} min={1} onChange={(thickness) => onChange({ thickness })} /></div>
        </div>
      )}
      {widget.type === 'animation' && (
        <div className="field-section"><h3>Animation</h3><div className="field-row"><NumberField label="Interval ms" value={widget.intervalMs} min={16} onChange={(intervalMs) => onChange({ intervalMs })} /><NumberField label="Repeat (0=∞)" value={widget.repeat} min={0} onChange={(repeat) => onChange({ repeat })} /></div><div className="binding-code"><span>Frames</span><code>{widget.frames.length}</code></div></div>
      )}
      <div className="danger-actions"><button onClick={onDuplicate}>Duplicate</button><button className="danger" onClick={onDelete}>Delete</button></div>
    </section>
  )
}
