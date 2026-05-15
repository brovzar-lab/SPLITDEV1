import type { Scene, ScreenplayScene } from '../types';

export const SCENES: Scene[] = [
  { id: 1, heading: 'INT. CABIN - DAY',          hasNotes: true  },
  { id: 2, heading: 'EXT. WOODS - DAY',          hasNotes: true  },
  { id: 3, heading: 'INT. BASEMENT - NIGHT',     hasNotes: false },
  { id: 4, heading: 'EXT. LAKE - DUSK',          hasNotes: true  },
  { id: 5, heading: 'INT. CABIN - NIGHT',        hasNotes: false },
  { id: 6, heading: 'EXT. ROAD - NIGHT',         hasNotes: false },
  { id: 7, heading: 'INT. CAR - NIGHT',          hasNotes: true  },
  { id: 8, heading: 'EXT. GAS STATION - NIGHT',  hasNotes: false },
  { id: 9, heading: 'INT. CABIN - DAWN',         hasNotes: false },
];

export const SCREENPLAY: ScreenplayScene[] = [
  {
    sceneId: 1,
    heading: 'INT. CABIN - DAY',
    lines: [
      {
        type: 'action',
        text: 'The cabin is old and dusty. Sunlight filters through dirty windows.',
        change: {
          id: 'c1',
          status: 'pending',
          agent: 'Dialogue',
          deleted:
            'The cabin is old and dusty. Sunlight filters through dirty windows. SARAH (28) enters carrying a bag.',
          inserted:
            'A phone BUZZES. SARAH (28, sharp eyes, tired) pushes through the front door mid-call, barely glancing at the dust-choked room.',
        },
      },
      { type: 'action', text: 'Furniture covered in white sheets. A grandfather clock ticks in the corner.' },
      { type: 'dialogue', character: 'SARAH', line: "I told you, I'll be fine. It's just a weekend." },
      { type: 'action', text: 'She sets her bag down. Something CREAKS upstairs.' },
      { type: 'dialogue', character: 'SARAH', parenthetical: 'into phone', line: 'Hold on—' },
      { type: 'action', text: 'She stares at the ceiling. The creaking stops.' },
      { type: 'action', text: 'Sarah slowly lowers the phone. Listens. Nothing.' },
      {
        type: 'dialogue',
        character: 'SARAH',
        parenthetical: 'into phone, forced casual',
        line: "It's nothing. Old house noises.",
      },
    ],
  },
  {
    sceneId: 2,
    heading: 'EXT. WOODS - DAY',
    lines: [
      { type: 'action', text: 'A narrow trail cuts through dense pines. Morning fog clings to the ground.' },
      { type: 'action', text: "Sarah walks the trail, earbuds in. She doesn't notice the FIGURE behind the trees." },
      { type: 'dialogue', character: 'SARAH', parenthetical: 'to herself', line: 'This was supposed to be relaxing...' },
      {
        type: 'action',
        text: 'She stops at a clearing. The woods are silent.',
        change: {
          id: 'c2',
          status: 'pending',
          agent: 'Structure',
          deleted: 'She stops at a clearing. The woods are silent.',
          inserted:
            'She stops at a clearing. Too silent. Even the birds have stopped. She pulls out an earbud.',
        },
      },
      { type: 'action', text: 'A BRANCH snaps somewhere behind her. She spins around.' },
      { type: 'dialogue', character: 'SARAH', line: 'Hello?' },
      { type: 'action', text: 'Nothing. Just the trees. She exhales, walks faster.' },
    ],
  },
  {
    sceneId: 3,
    heading: 'INT. BASEMENT - NIGHT',
    lines: [
      { type: 'action', text: 'Concrete stairs descend into darkness. A bare bulb swings overhead, casting wild shadows.' },
      { type: 'action', text: 'Sarah reaches the bottom step. Stops. Listens.' },
      { type: 'dialogue', character: 'SARAH', parenthetical: 'whispered', line: 'Hello?' },
      { type: 'action', text: 'The bulb flickers. In the strobe, something MOVES in the far corner.' },
      { type: 'action', text: 'Sarah fumbles for her phone flashlight. Hands shaking.' },
      { type: 'dialogue', character: 'SARAH', parenthetical: 'to herself', line: 'Just the boiler. Just the boiler.' },
    ],
  },
  {
    sceneId: 4,
    heading: 'EXT. LAKE - DUSK',
    lines: [
      { type: 'action', text: 'Golden hour light on still water. The lake is glass-smooth, reflecting the treeline.' },
      { type: 'action', text: 'Sarah sits on the dock, feet dangling. A moment of peace.' },
      { type: 'action', text: 'Something BUMPS the underside of the dock. She pulls her feet up.' },
      { type: 'dialogue', character: 'SARAH', line: 'What the...' },
      { type: 'action', text: 'She peers over the edge. The water is dark, opaque. Another BUMP.' },
    ],
  },
];

export const SCENE_EIGHTHS: Record<number, string> = {
  1: '1 5/8', 2: '7/8',   3: '1 2/8', 4: '1',     5: '6/8',
  6: '4/8',   7: '1 1/8', 8: '5/8',   9: '7/8',
};
