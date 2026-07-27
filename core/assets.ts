import type { WatchFaceLayout, WatchFaceWidget } from './types.ts'

export interface AssetReference {
  path: string
  owner: string
  theme: 'normal' | 'aod'
  role: string
}

function widgetReferences(widget: WatchFaceWidget, theme: 'normal' | 'aod', layout: WatchFaceLayout): AssetReference[] {
  const reference = (path: string, role: string): AssetReference => ({ path, owner: widget.id, theme, role })

  switch (widget.type) {
    case 'image':
      return [reference(widget.asset, 'image')]
    case 'number': {
      const digitSet = layout.assets.digitSets[widget.digitSet]
      if (!digitSet) return []
      const refs = [...digitSet.digits, digitSet.minus].map((path, index) => reference(path, index === 10 ? 'minus' : `digit-${index}`))
      if (widget.unitAsset) refs.push(reference(widget.unitAsset, 'unit'))
      return refs
    }
    case 'image-list':
      return widget.items.map((item) => reference(item.asset, `value-${item.value}`))
    case 'progress': {
      const refs = [reference(widget.foreground, 'foreground')]
      if (widget.background) refs.push(reference(widget.background, 'background'))
      return refs
    }
    case 'animation':
      return widget.frames.map((path, index) => reference(path, `frame-${index}`))
  }
}

export function collectAssetReferences(layout: WatchFaceLayout): AssetReference[] {
  const refs = layout.normal.widgets.flatMap((widget) => widgetReferences(widget, 'normal', layout))
  if (layout.aod?.enabled) {
    refs.push(...layout.aod.widgets.flatMap((widget) => widgetReferences(widget, 'aod', layout)))
  }
  return refs
}