import type { DragEvent } from 'react'
import type { WidgetType } from '../../../core/types.ts'

interface WidgetPaletteProps { onAdd: (type: WidgetType) => void }

const widgets: Array<{ type: WidgetType; icon: string; label: string }> = [
  { type: 'image', icon: '◇', label: 'Image' },
  { type: 'number', icon: '12', label: 'Number' },
  { type: 'image-list', icon: '≡', label: 'Image list' },
  { type: 'progress', icon: '◒', label: 'Progress' },
  { type: 'animation', icon: '▶', label: 'Animation' },
]

export function WidgetPalette({ onAdd }: WidgetPaletteProps) {
  const startDrag = (event: DragEvent<HTMLButtonElement>, type: WidgetType) => {
    event.dataTransfer.setData('application/x-band10-widget', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <section className="widget-palette">
      <div className="palette-title"><span className="eyebrow">Components</span><h2>Widgets</h2></div>
      <p>Drag onto the display or click to add.</p>
      <div className="widget-grid">
        {widgets.map((widget) => (
          <button key={widget.type} draggable onDragStart={(event) => startDrag(event, widget.type)} onClick={() => onAdd(widget.type)}>
            <span>{widget.icon}</span>{widget.label}
          </button>
        ))}
      </div>
    </section>
  )
}
