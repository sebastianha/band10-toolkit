import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { SimulationState, WatchFaceLayout, WatchFaceWidget, WidgetType } from '../../../core/types.ts'
import { formatNumberValue, getSourceValue, selectImageListItem } from '../../../core/simulator.ts'

interface AssetSize { width: number; height: number }
interface Point { x: number; y: number }
interface Bounds extends Point { width: number; height: number }

interface WatchCanvasProps {
  layout: WatchFaceLayout
  mode: 'normal' | 'aod'
  simulation: SimulationState
  selectedId?: string
  snap: number
  showGrid: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onDropWidget: (type: WidgetType, x: number, y: number) => void
}

function assetReferences(layout: WatchFaceLayout): string[] {
  const output = new Set<string>()
  for (const set of Object.values(layout.assets.digitSets)) {
    for (const asset of [...set.digits, set.minus]) output.add(asset)
  }
  const themes = [layout.normal, ...(layout.aod?.enabled ? [layout.aod] : [])]
  for (const theme of themes) {
    for (const widget of theme.widgets) {
      if (widget.type === 'image') output.add(widget.asset)
      if (widget.type === 'number' && widget.unitAsset) output.add(widget.unitAsset)
      if (widget.type === 'image-list') widget.items.forEach((item) => output.add(item.asset))
      if (widget.type === 'progress') {
        output.add(widget.foreground)
        if (widget.background) output.add(widget.background)
      }
      if (widget.type === 'animation') widget.frames.forEach((frame) => output.add(frame))
    }
  }
  return [...output]
}

function useAssetSizes(layout: WatchFaceLayout): Map<string, AssetSize> {
  const [sizes, setSizes] = useState<Map<string, AssetSize>>(new Map())
  const references = useMemo(() => assetReferences(layout), [layout])
  useEffect(() => {
    let active = true
    for (const reference of references) {
      const image = new Image()
      image.onload = () => {
        if (!active) return
        setSizes((current) => new Map(current).set(reference, { width: image.naturalWidth, height: image.naturalHeight }))
      }
      image.src = reference
    }
    return () => { active = false }
  }, [references])
  return sizes
}

function numberGlyphs(widget: Extract<WatchFaceWidget, { type: 'number' }>, layout: WatchFaceLayout, simulation: SimulationState): string[] {
  const set = layout.assets.digitSets[widget.digitSet]
  if (!set) return []
  const text = formatNumberValue(getSourceValue(widget.source, simulation), widget.digits, widget.leadingZero ?? false)
  return [...text].map((character) => character === '-' ? set.minus : set.digits[Number(character)] ?? set.digits[0])
}

function widgetBounds(widget: WatchFaceWidget, layout: WatchFaceLayout, simulation: SimulationState, sizes: Map<string, AssetSize>): Bounds {
  if (widget.type === 'progress') return { x: widget.x, y: widget.y, width: widget.width, height: widget.height }
  if (widget.type === 'number') {
    const glyphs = numberGlyphs(widget, layout, simulation)
    const glyphSizes = glyphs.map((glyph) => sizes.get(glyph) ?? { width: 18, height: 28 })
    const unit = widget.unitAsset ? sizes.get(widget.unitAsset) : undefined
    const width = glyphSizes.reduce((total, size) => total + size.width, 0) + Math.max(0, glyphs.length - 1) * (widget.spacing ?? 0) + (unit?.width ?? 0)
    const height = Math.max(unit?.height ?? 0, ...glyphSizes.map((size) => size.height), 24)
    const x = widget.align === 'center' ? widget.x - width / 2 : widget.align === 'right' ? widget.x - width : widget.x
    return { x, y: widget.y, width, height }
  }
  let reference: string | undefined
  if (widget.type === 'image') reference = widget.asset
  if (widget.type === 'image-list') reference = selectImageListItem(widget.items, getSourceValue(widget.source, simulation), widget.fallback)?.asset
  if (widget.type === 'animation') {
    const time = new Date(simulation.dateTime).getTime()
    reference = widget.frames[Math.abs(Math.floor(time / widget.intervalMs)) % widget.frames.length]
  }
  const size = reference ? sizes.get(reference) : undefined
  return { x: widget.x, y: widget.y, width: size?.width ?? 32, height: size?.height ?? 32 }
}

function screenPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const matrix = svg.getScreenCTM()?.inverse()
  if (!matrix) return { x: 0, y: 0 }
  const transformed = point.matrixTransform(matrix)
  return { x: transformed.x, y: transformed.y }
}

function renderWidget(widget: WatchFaceWidget, layout: WatchFaceLayout, simulation: SimulationState, sizes: Map<string, AssetSize>): ReactNode {
  const opacity = widget.opacity ?? 1
  if (widget.type === 'image') {
    const size = sizes.get(widget.asset) ?? { width: 32, height: 32 }
    return <image href={widget.asset} x={widget.x} y={widget.y} width={size.width} height={size.height} opacity={opacity} />
  }
  if (widget.type === 'number') {
    const glyphs = numberGlyphs(widget, layout, simulation)
    const glyphSizes = glyphs.map((glyph) => sizes.get(glyph) ?? { width: 18, height: 28 })
    const totalWidth = glyphSizes.reduce((total, size) => total + size.width, 0) + Math.max(0, glyphs.length - 1) * (widget.spacing ?? 0)
    let x = widget.align === 'center' ? widget.x - totalWidth / 2 : widget.align === 'right' ? widget.x - totalWidth : widget.x
    const elements = glyphs.map((glyph, index) => {
      const size = glyphSizes[index] ?? { width: 18, height: 28 }
      const element = <image key={`${glyph}-${index}`} href={glyph} x={x} y={widget.y} width={size.width} height={size.height} opacity={opacity} />
      x += size.width + (widget.spacing ?? 0)
      return element
    })
    if (widget.unitAsset) {
      const size = sizes.get(widget.unitAsset) ?? { width: 12, height: 12 }
      elements.push(<image key="unit" href={widget.unitAsset} x={x} y={widget.y} width={size.width} height={size.height} opacity={opacity} />)
    }
    return elements
  }
  if (widget.type === 'image-list') {
    const item = selectImageListItem(widget.items, getSourceValue(widget.source, simulation), widget.fallback)
    if (!item) return null
    const size = sizes.get(item.asset) ?? { width: 32, height: 32 }
    return <image href={item.asset} x={widget.x} y={widget.y} width={size.width} height={size.height} opacity={opacity} />
  }
  if (widget.type === 'animation') {
    const time = new Date(simulation.dateTime).getTime()
    const frame = widget.frames[Math.abs(Math.floor(time / widget.intervalMs)) % widget.frames.length]
    if (!frame) return null
    const size = sizes.get(frame) ?? { width: 32, height: 32 }
    return <image href={frame} x={widget.x} y={widget.y} width={size.width} height={size.height} opacity={opacity} />
  }
  const ratio = Math.max(0, Math.min(1, getSourceValue(widget.source, simulation) / widget.maximum))
  if (widget.shape === 'bar') {
    const id = `clip-${widget.id.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}`
    return (
      <>
        {widget.background && <image href={widget.background} x={widget.x} y={widget.y} width={widget.width} height={widget.height} opacity={opacity} preserveAspectRatio="none" />}
        <defs><clipPath id={id}><rect x={widget.x} y={widget.y} width={widget.width * ratio} height={widget.height} /></clipPath></defs>
        <image href={widget.foreground} x={widget.x} y={widget.y} width={widget.width} height={widget.height} opacity={opacity} preserveAspectRatio="none" clipPath={`url(#${id})`} />
      </>
    )
  }
  const radius = Math.max(1, Math.min(widget.width, widget.height) / 2 - widget.thickness / 2)
  const circumference = 2 * Math.PI * radius
  const centerX = widget.x + widget.width / 2
  const centerY = widget.y + widget.height / 2
  return (
    <g transform={`rotate(${(widget.startAngle ?? -90) - 90} ${centerX} ${centerY})`} opacity={opacity}>
      <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#19212c" strokeWidth={widget.thickness} />
      <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#bcff45" strokeWidth={widget.thickness} strokeLinecap="round" strokeDasharray={`${circumference * ratio} ${circumference}`} />
    </g>
  )
}

export function WatchCanvas({ layout, mode, simulation, selectedId, snap, showGrid, onSelect, onMove, onDropWidget }: WatchCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; pointer: Point; origin: Point } | undefined>(undefined)
  const sizes = useAssetSizes(layout)
  const theme = mode === 'aod' && layout.aod?.enabled ? layout.aod : layout.normal
  const widgets = [...theme.widgets].filter((widget) => widget.visible !== false).sort((left, right) => left.z - right.z)

  const pointerDown = (event: ReactPointerEvent<SVGGElement>, widget: WatchFaceWidget) => {
    event.stopPropagation()
    if (widget.locked || !svgRef.current) return onSelect(widget.id)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: widget.id, pointer: screenPoint(svgRef.current, event.clientX, event.clientY), origin: { x: widget.x, y: widget.y } }
    onSelect(widget.id)
  }
  const pointerMove = (event: ReactPointerEvent<SVGGElement>) => {
    if (!dragRef.current || !svgRef.current) return
    const current = screenPoint(svgRef.current, event.clientX, event.clientY)
    const x = Math.round((dragRef.current.origin.x + current.x - dragRef.current.pointer.x) / snap) * snap
    const y = Math.round((dragRef.current.origin.y + current.y - dragRef.current.pointer.y) / snap) * snap
    onMove(dragRef.current.id, x, y)
  }
  const pointerUp = () => { dragRef.current = undefined }
  const drop = (event: ReactDragEvent<SVGSVGElement>) => {
    event.preventDefault()
    if (!svgRef.current) return
    const type = event.dataTransfer.getData('application/x-band10-widget') as WidgetType
    if (!['image', 'number', 'image-list', 'progress', 'animation'].includes(type)) return
    const point = screenPoint(svgRef.current, event.clientX, event.clientY)
    onDropWidget(type, point.x, point.y)
  }

  return (
    <svg
      ref={svgRef}
      className="watch-canvas"
      viewBox={`0 0 ${layout.canvas.width} ${layout.canvas.height}`}
      role="application"
      aria-label={`${mode === 'aod' ? 'Always-on' : 'Active'} watch-face canvas`}
      onClick={(event) => event.stopPropagation()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
    >
      <defs>
        <clipPath id="device-screen"><rect width={layout.canvas.width} height={layout.canvas.height} rx={layout.canvas.clip === 'pill' ? layout.canvas.width / 2 : 0} /></clipPath>
        <pattern id="minor-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#b9ff3d" strokeOpacity=".08" strokeWidth=".5" /></pattern>
        <pattern id="major-grid" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#minor-grid)"/><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#b9ff3d" strokeOpacity=".13" strokeWidth=".7"/></pattern>
      </defs>
      <g clipPath="url(#device-screen)">
        <rect width="100%" height="100%" fill={theme.background} />
        {showGrid && <rect width="100%" height="100%" fill="url(#major-grid)" pointerEvents="none" />}
        <line x1={layout.canvas.width / 2} x2={layout.canvas.width / 2} y1="0" y2={layout.canvas.height} stroke="#b9ff3d" strokeOpacity=".16" strokeDasharray="2 3" pointerEvents="none" />
        {widgets.map((widget) => {
          const bounds = widgetBounds(widget, layout, simulation, sizes)
          return (
            <g
              key={widget.id}
              className={`canvas-widget ${widget.id === selectedId ? 'selected' : ''} ${widget.locked ? 'locked' : ''}`}
              onPointerDown={(event) => pointerDown(event, widget)}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
            >
              {renderWidget(widget, layout, simulation, sizes)}
              <rect className="hit-target" x={bounds.x} y={bounds.y} width={Math.max(8, bounds.width)} height={Math.max(8, bounds.height)} fill="transparent" />
              {widget.id === selectedId && (
                <g className="selection-frame" pointerEvents="none">
                  <rect x={bounds.x - 2} y={bounds.y - 2} width={bounds.width + 4} height={bounds.height + 4} rx="2" />
                  <circle cx={bounds.x - 2} cy={bounds.y - 2} r="2.5" />
                  <circle cx={bounds.x + bounds.width + 2} cy={bounds.y - 2} r="2.5" />
                  <circle cx={bounds.x - 2} cy={bounds.y + bounds.height + 2} r="2.5" />
                  <circle cx={bounds.x + bounds.width + 2} cy={bounds.y + bounds.height + 2} r="2.5" />
                  <text x={Math.max(2, bounds.x)} y={Math.max(9, bounds.y - 6)}>{widget.x}, {widget.y}</text>
                </g>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
