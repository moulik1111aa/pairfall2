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

export interface Theme {
  readonly id: string;
  readonly name: string;
  /** CSS custom properties applied to the document root. */
  readonly vars: Readonly<Record<string, string>>;
  readonly tiles: readonly { name: string; svg: string }[];
  /** Tile body colours (face, edge, dark rim). */
  readonly tile: { readonly face: string; readonly edge: string; readonly rim: string };
  readonly particles: ParticlePreset;
  /** Background decoration, drawn as an SVG data URI. */
  readonly backdrop: string;
}
