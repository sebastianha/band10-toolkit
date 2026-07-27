import type { SimulationState } from '../../../core/types.ts'

interface SimulatorProps {
  value: SimulationState
  liveTime: boolean
  weatherConditions: Record<number, string>
  onChange: (value: SimulationState) => void
  onLiveTime: (value: boolean) => void
  onReset: () => void
}

export function Simulator({ value, liveTime, weatherConditions, onChange, onLiveTime, onReset }: SimulatorProps) {
  const patch = (next: Partial<SimulationState>) => onChange({ ...value, ...next })
  return (
    <section className="simulator-panel">
      <div className="section-heading"><div><span className="eyebrow">Runtime data</span><h2>Simulator</h2></div><button className="text-button" onClick={onReset}>Reset</button></div>
      <p className="panel-help">Bindings update instantly without installing the face. Values emulate firmware data sources, not sensor accuracy.</p>
      <div className="field-section">
        <h3>Time & date</h3>
        <label className="field"><span>Local time</span><input type="datetime-local" step="1" value={value.dateTime} disabled={liveTime} onChange={(event) => patch({ dateTime: event.target.value })} /></label>
        <div className="toggle-row"><span>Use system clock</span><button className={`toggle ${liveTime ? 'on' : ''}`} onClick={() => onLiveTime(!liveTime)}><i /></button></div>
      </div>
      <div className="field-section">
        <h3>Health</h3>
        <label className="range-field"><span>Heart rate <strong>{value.heartRate} bpm</strong></span><input type="range" min="35" max="220" value={value.heartRate} onChange={(event) => patch({ heartRate: Number(event.target.value) })} /></label>
        <label className="range-field"><span>Steps <strong>{value.steps.toLocaleString()}</strong></span><input type="range" min="0" max="30000" step="100" value={value.steps} onChange={(event) => patch({ steps: Number(event.target.value) })} /></label>
        <label className="range-field"><span>Stress <strong>{value.stress}</strong></span><input type="range" min="0" max="100" value={value.stress} onChange={(event) => patch({ stress: Number(event.target.value) })} /></label>
      </div>
      <div className="field-section">
        <h3>Device</h3>
        <label className="range-field"><span>Battery <strong>{value.battery}%</strong></span><input type="range" min="0" max="100" value={value.battery} onChange={(event) => patch({ battery: Number(event.target.value) })} /></label>
        <div className="toggle-row"><span>Bluetooth</span><button className={`toggle ${value.bluetooth ? 'on' : ''}`} onClick={() => patch({ bluetooth: !value.bluetooth })}><i /></button></div>
        <div className="toggle-row"><span>Sleep state</span><button className={`toggle ${value.sleepStatus ? 'on' : ''}`} onClick={() => patch({ sleepStatus: !value.sleepStatus })}><i /></button></div>
      </div>
      <div className="field-section">
        <h3>Weather</h3>
        <label className="field"><span>Condition</span><select value={value.weatherCondition} onChange={(event) => patch({ weatherCondition: Number(event.target.value) })}>{Object.entries(weatherConditions).map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></label>
        <label className="range-field"><span>Temperature <strong>{value.temperatureC}°C</strong></span><input type="range" min="-40" max="55" value={value.temperatureC} onChange={(event) => patch({ temperatureC: Number(event.target.value) })} /></label>
      </div>
      <div className="simulation-note"><span>i</span><p>Weather comes from the phone. On hardware, stale values can remain until Mi Fitness or another companion synchronizes.</p></div>
    </section>
  )
}
