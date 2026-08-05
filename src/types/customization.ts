export interface CharacterSkin {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorHex: string;
  gloveColor: string;
  badge: string;
}

export const CHARACTER_SKINS: CharacterSkin[] = [
  {
    id: 'male_survivor',
    name: 'Alex (Sobreviviente)',
    description: 'Personaje masculino preparado para enfrentar los eventos nocturnos de la casa.',
    icon: '🧔‍♂️',
    colorHex: '#3b82f6',
    gloveColor: '#1e293b',
    badge: 'HOMBRE',
  },
  {
    id: 'female_survivor',
    name: 'Elena (Sobreviviente)',
    description: 'Personaje femenino equipada para la exploración y supervivencia en los Backrooms.',
    icon: '👩‍💼',
    colorHex: '#ec4899',
    gloveColor: '#831843',
    badge: 'MUJER',
  },
];

export interface MultiplayerPlayer {
  id: string;
  name: string;
  skinId: string;
  isHost: boolean;
  isReady: boolean;
  health: number;
  ping: number;
}
