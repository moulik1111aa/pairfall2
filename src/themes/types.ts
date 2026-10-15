// What a theme provides (spec §7). One self-contained folder per theme.

export interface ParticlePreset {
  /** Particle colours, picked at random per particle. */
  readonly colors: readonly string[];
  /** Particle shape. */
  readonly shape: 'petal' | 'star' | 'spark';
  /** Base particle count for a single pair clear. */
  readonly count: number;
  /** Downward pull in px/s². */
  readonly gravity: number;
}

export interface ThemeSound {
  /** Semitone offsets of the pentatonic scale used for matches and music. */
  readonly scale: readonly number[];
  /** Root note in Hz for match notes. */
  readonly base: number;
  readonly instrument: 'koto' | 'synth' | 'sitar';
  /** Drone notes (Hz) under the music. */
  readonly drone: readonly number[];
}

export interface Theme {
  readonly id: string;
  readonly name: string;
  /** Journey level that must be reached to use this theme. */
  readonly unlockLevel: number;
  /** One line describing the look, shown in the themes gallery. */
  readonly blurb: string;
  /** Sound flavour: scale and instrument for plucks and music. */
  readonly sound: ThemeSound;
  /** CSS custom properties applied to the document root. */
  readonly vars: Readonly<Record<string, string>>;
  readonly tiles: readonly { name: string; svg: string }[];
  /** Tile body colours: face (top → bottom shade), side edge (top → bottom shade), outline rim. */
  readonly tile: {
    readonly face: string;
    readonly faceShade: string;
    readonly edge: string;
    readonly edgeShade: string;
    readonly rim: string;
    /** Inner bevel highlight colour (defaults to white). */
    readonly highlight?: string;
  };
  readonly particles: ParticlePreset;
  /** Optional replacements for the shared wild and face-down tile art. */
  readonly wildArt?: string;
  readonly mysteryArt?: string;
  /** Background decoration, drawn as an SVG data URI. */
  readonly backdrop: string;
}
