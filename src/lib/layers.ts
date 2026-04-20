export type LayerSource =
  | { kind: 'color'; value: string }
  | { kind: 'gradient'; value: string }
  | { kind: 'pattern'; pattern: string; color: string; bgColor: string; opacity: number }
  | { kind: 'blur'; strength: number; saturation: number }
  | { kind: 'whiteboard' }
  | { kind: 'screen' }
  | { kind: 'video-file'; url: string | null; playing: boolean; currentTime: number }
  | { kind: 'webcam' }

export type LayerType = 'background' | 'content' | 'persona' | 'annotation' | 'teleprompter'

export interface Layer {
  id: string
  type: LayerType
  visible: boolean
  source: LayerSource
  transform: {
    x: number
    y: number
    width: number
    height: number
  }
  style: {
    shape?: 'circle' | 'rect-h' | 'rect-v' | 'square' | 'full' | 'split-top' | 'split-bottom' | 'hidden'
    borderRadius?: string
    filter?: string
    opacity?: number
    zIndex: number
    border?: { enabled: boolean; color: string; width: number }
  }
  locked?: boolean
}

export function getLayer(layers: Layer[], type: LayerType): Layer | undefined {
  return layers.find(l => l.type === type)
}

export function getLayerById(layers: Layer[], id: string): Layer | undefined {
  return layers.find(l => l.id === id)
}

export function patchLayer(layers: Layer[], id: string, patch: Omit<Partial<Layer>, 'source' | 'transform' | 'style'> & {
  source?: Partial<LayerSource>
  transform?: Partial<Layer['transform']>
  style?: Partial<Layer['style']>
}): Layer[] {
  return layers.map(l => {
    if (l.id !== id) return l
    return {
      ...l,
      ...patch,
      source: patch.source ? { ...l.source, ...patch.source } as LayerSource : l.source,
      transform: patch.transform ? { ...l.transform, ...patch.transform } : l.transform,
      style: patch.style ? { ...l.style, ...patch.style } : l.style,
    }
  })
}

export function patchLayerByType(layers: Layer[], type: LayerType, patch: Parameters<typeof patchLayer>[2]): Layer[] {
  const target = getLayer(layers, type)
  if (!target) return layers
  return patchLayer(layers, target.id, patch)
}

export function createDefaultLayers(): Layer[] {
  return [
    {
      id: 'bg-1',
      type: 'background',
      visible: true,
      source: { kind: 'color', value: '#FAFAFA' },
      transform: { x: 0, y: 0, width: 0, height: 0 },
      style: { zIndex: 0 },
    },
    {
      id: 'content-1',
      type: 'content',
      visible: true,
      source: { kind: 'whiteboard' },
      transform: { x: 0, y: 0, width: 0, height: 0 },
      style: { zIndex: 1 },
    },
    {
      id: 'persona-1',
      type: 'persona',
      visible: true,
      source: { kind: 'webcam' },
      transform: { x: 0, y: 0, width: 180, height: 180 },
      style: {
        shape: 'circle',
        borderRadius: '50%',
        zIndex: 10,
        border: { enabled: false, color: '#FFFFFF', width: 3 },
      },
    },
  ]
}
