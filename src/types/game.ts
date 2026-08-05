export enum GamePhase {
  CALM = 'CALM',
  GLITCH = 'GLITCH',
  DEFENSE = 'DEFENSE'
}

export interface PlayerState {
  health: number; // 0 to 100
  stamina: number; // 0 to 100
  battery: number; // 0 to 100 (for flashlight/devices)
  ammo: number; // bullets available for weapons
  isSprinting: boolean;
  isCrouching: boolean;
  isGrounded: boolean;
  selectedSlot: number; // 0 to 3
  inventory: (Item | null)[];
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  type: 'flashlight' | 'phone' | 'horn' | 'boombox' | 'plank' | 'key' | 'weapon' | 'ammo' | 'medkit';
  description: string;
  batteryUsage?: number;
  healAmount?: number;
  ammoAmount?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  phase: GamePhase;
  targetId?: string;
}

export interface BoundingBox3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  name?: string;
  isPortal?: boolean;
  isInteractable?: boolean;
}

export interface EntityState {
  id: string;
  x: number;
  y: number;
  z: number;
  health: number;
  speed: number;
  state: 'idle' | 'chasing' | 'stunned' | 'attacking';
}

export interface ControlsInput {
  moveForward: number; // -1 to 1
  moveRight: number; // -1 to 1
  lookDeltaX: number;
  lookDeltaY: number;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  interact: boolean;
  useItem: boolean;
}
