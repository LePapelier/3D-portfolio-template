  export interface Node {
    id: string;
    templateKey: string;
    visualType: 'sphere' | 'text';
    href?: string;
    expanding?: boolean;
    expandTo?: [number, number, number];
    expandStartAt?: number;
    collapsing?: boolean;
    collapseRole?: 'source' | 'target';
    collapseReverseRequested?: boolean;
    collapseStartAt?: number;
    position: [number, number, number];
    velocity: [number, number, number];
    label: string;
    depth: number;
    spawnFrom: [number, number, number];
    parentId?: string;
    childrenIds?: string[];
    expanded?: boolean;
    radius?: number;
  }

export type Language = 'en' | 'fr'

export interface GraphState {
  nodes: Node[]
  language: Language
  draggedNodeId: string | null
  hoveredNodeId: string | null
  focusedCardNodeId: string | null
  expandNode: (id: string) => void
  setLanguage: (language: Language) => void
  setHoveredNode: (id: string | null) => void
  setFocusedCardNodeId: (id: string | null) => void
  startDragging: (id: string) => void
  stopDragging: () => void
  moveNode: (id: string, position: [number, number, number]) => void
  tickPhysics: (delta: number) => void
}

export interface PortfolioChild {
  key: string
  label: string
  href?: string
}
