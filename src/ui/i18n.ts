// Instructions in English with Hindi alongside. Every how-to-play message the game
// shows comes from here, so the two languages always travel together. Hindi can be
// switched off in Settings (it is on by default).
//
// Power-up names stay in English inside the Hindi text, because that is what the
// buttons say.

import { CONFIG } from '../config.ts';

/** One message in both languages. */
export interface Bi {
  en: string;
  hi: string;
}

/** Markup for a message: English, then Hindi on its own line (when wanted). */
export function bi(t: Bi, hindi: boolean): string {
  if (!hindi) return t.en;
  return `<span class="en">${t.en}</span><span class="hi" lang="hi">${t.hi}</span>`;
}

const { early, normal, earlyUntilLevel } = CONFIG.trayLimit;

export const TEXT = {
  tagline: { en: 'Match the pairs. Keep the tray clear.', hi: 'जोड़ियाँ मिलाएँ, ट्रे खाली रखें।' },

  // ── Tutorial (levels 1–3) ──
  tutorialTap: { en: 'Tap a tile to move it into the tray', hi: 'किसी टाइल पर टैप करें, वह ट्रे में चली जाएगी' },
  tutorialTwin: { en: 'Now tap its twin to clear the pair', hi: 'अब उसकी जोड़ीदार टाइल पर टैप करें, जोड़ी साफ़ हो जाएगी' },
  tutorialLimit: (limit: number): Bi => ({
    en: `Clear pairs before the tray fills — ${limit} unmatched tiles and it's over`,
    hi: `ट्रे भरने से पहले जोड़ियाँ साफ़ करें — ${limit} बेमेल टाइलें होते ही खेल ख़त्म`,
  }),
  tutorialCovered: {
    en: 'Dimmed tiles are covered or boxed in. Clear a tile on top or beside them to free them',
    hi: 'धुंधली टाइलें ढकी हुई हैं या चारों ओर से घिरी हैं। ऊपर या बगल की टाइल हटाएँ, तब ये खुलेंगी',
  },
  tutorialPlan: {
    en: 'Plan ahead: start a new pair only when its twin is in reach',
    hi: 'आगे की सोचें: नई जोड़ी तभी शुरू करें जब उसकी जोड़ीदार टाइल भी पहुँच में हो',
  },

  // ── Losing ──
  trayFullTitle: { en: 'Tray full', hi: 'ट्रे भर गई' },
  trayFull: (limit: number): Bi => ({
    en: `${limit} tiles were waiting for their twins. Try finishing a pair before starting a new one.`,
    hi: `${limit} टाइलें अपनी जोड़ीदार का इंतज़ार कर रही थीं। नई जोड़ी शुरू करने से पहले पिछली पूरी करने की कोशिश करें।`,
  }),
  bombTitle: { en: 'Boom!', hi: 'धमाका!' },
  bombLost: {
    en: 'A bomb’s countdown reached zero. Go after bomb tiles early and match them before their number runs out.',
    hi: 'बम की गिनती शून्य हो गई। बम वाली टाइलों तक जल्दी पहुँचें और उनकी गिनती ख़त्म होने से पहले उनकी जोड़ी बनाएँ।',
  },
  timeUpTitle: { en: 'Time’s up', hi: 'समय ख़त्म' },
  timeUp: {
    en: 'The clock ran out before the board was cleared. Keep pairs moving: finish one before starting the next.',
    hi: 'बोर्ड साफ़ होने से पहले घड़ी का समय ख़त्म हो गया। जोड़ियाँ बनाते चलें: नई शुरू करने से पहले पिछली पूरी करें।',
  },
  boxedIn: {
    en: 'Boxed in: clear a tile beside it first',
    hi: 'यह टाइल चारों ओर से घिरी है — पहले इसके बगल की कोई टाइल हटाएँ',
  },
  jumpTitle: { en: 'Jump to a level', hi: 'किसी लेवल पर जाएँ' },
  jumpNote: {
    en: 'Pick a level to play now. Levels you skip stay open, so you can come back to them any time.',
    hi: 'अभी खेलने के लिए कोई लेवल चुनें। छोड़े गए लेवल खुले रहेंगे, आप कभी भी उन पर लौट सकते हैं।',
  },
  stuckTitle: { en: 'No moves left', hi: 'कोई चाल नहीं बची' },
  stuck: {
    en: 'Every tile that is left is frozen or locked, and nothing can free it. Clear pairs near frozen tiles earlier next time.',
    hi: 'बची हुई हर टाइल जमी हुई है या ताले में है, और उसे खोलने का कोई रास्ता नहीं बचा। अगली बार जमी हुई टाइलों के पास की जोड़ियाँ पहले साफ़ करें।',
  },

  // ── Power-up tips ──
  notEnoughCoins: (name: string): Bi => ({
    en: `Not enough coins for ${name}. Win levels to earn more.`,
    hi: `${name} के लिए सिक्के कम हैं। लेवल जीतकर और सिक्के कमाएँ।`,
  }),
  undoNothing: {
    en: 'Undo takes back a tile that is still waiting in the tray.',
    hi: 'Undo सिर्फ़ उसी टाइल को वापस लाता है जो अभी ट्रे में इंतज़ार कर रही हो।',
  },
  noSafeMove: {
    en: 'No safe move left. Try Undo, Shuffle or +1 Slot.',
    hi: 'कोई सुरक्षित चाल नहीं बची। Undo, Shuffle या +1 Slot आज़माएँ।',
  },
  shuffleNothing: {
    en: 'No better arrangement exists for these tiles. Nothing was charged.',
    hi: 'इन टाइलों को इससे बेहतर ढंग से नहीं सजाया जा सकता। कोई सिक्का नहीं कटा।',
  },

  // ── Other guidance ──
  pressBackAgain: { en: 'Press back again to leave', hi: 'बाहर जाने के लिए फिर से बैक दबाएँ' },
  themeUnlocked: (name: string): Bi => ({
    en: `New theme unlocked: <b>${name}</b>. Switch to it from Themes on the home screen.`,
    hi: `नई थीम खुली: <b>${name}</b>। होम स्क्रीन पर Themes में जाकर इसे चुनें।`,
  }),
  restoredFromBackup: { en: 'Your progress was restored from a backup copy.', hi: 'आपकी प्रगति बैकअप से वापस लाई गई।' },
  saveUnreadable: {
    en: 'Your saved progress could not be read, so a new game was started.',
    hi: 'आपकी सहेजी हुई प्रगति पढ़ी नहीं जा सकी, इसलिए नया खेल शुरू किया गया।',
  },
} as const;

/** One-time cards for rules that apply to whole levels. */
export const RULE_INTROS: Record<'edges' | 'timer', { title: Bi; text: Bi }> = {
  edges: {
    title: { en: 'Only edge tiles', hi: 'सिर्फ़ किनारे की टाइलें' },
    text: {
      en: 'You can tap a tile only when nothing is on top of it and at least one of its sides is open. A tile boxed in by neighbours stays dim until one of them is cleared.',
      hi: 'टाइल पर तभी टैप होगा जब उसके ऊपर कुछ न हो और उसकी कम से कम एक तरफ़ खाली हो। चारों ओर से घिरी टाइल तब तक धुंधली रहेगी, जब तक बगल की कोई टाइल साफ़ न हो।',
    },
  },
  timer: {
    title: { en: 'Timed level', hi: 'समय वाला लेवल' },
    text: {
      en: 'Clear the board before the clock at the top runs out. The clock stops while the game is paused.',
      hi: 'ऊपर की घड़ी का समय ख़त्म होने से पहले बोर्ड साफ़ करें। खेल रुका हो तो घड़ी भी रुकी रहती है।',
    },
  },
};

/** Special tiles: shown as an introduction card the first time each appears, and in How to play. */
export const SPECIALS: Record<'mystery' | 'frozen' | 'locks' | 'wild' | 'bombs', { title: Bi; text: Bi }> = {
  mystery: {
    title: { en: 'Face-down tiles', hi: 'उलटी टाइलें' },
    text: {
      en: 'These tiles hide their picture until the tiles on top of them are cleared.',
      hi: 'इन टाइलों की तस्वीर तब तक छिपी रहती है, जब तक इनके ऊपर की टाइलें साफ़ नहीं हो जातीं।',
    },
  },
  frozen: {
    title: { en: 'Frozen tiles', hi: 'जमी हुई टाइलें' },
    text: {
      en: 'Ice holds a tile in place. Every pair you clear while it is uncovered melts it a little; the number shows how many pairs are left.',
      hi: 'बर्फ़ टाइल को अपनी जगह जकड़े रखती है। जब यह टाइल खुली हो, तब आप जो भी जोड़ी साफ़ करेंगे, बर्फ़ थोड़ी पिघलेगी; अंक बताता है कि और कितनी जोड़ियाँ बाकी हैं।',
    },
  },
  locks: {
    title: { en: 'Locked tiles', hi: 'ताले वाली टाइलें' },
    text: {
      en: 'A padlocked tile opens once both tiles marked with a key have been cleared.',
      hi: 'ताले वाली टाइल तब खुलती है, जब चाबी के निशान वाली दोनों टाइलें साफ़ हो जाएँ।',
    },
  },
  wild: {
    title: { en: 'Wild tile', hi: 'वाइल्ड टाइल' },
    text: {
      en: 'The golden circle matches any tile. If that leaves a tile without its twin, the wild passes to that tile.',
      hi: 'सुनहरा घेरा किसी भी टाइल से जोड़ी बना लेता है। अगर इससे कोई टाइल बिना जोड़ीदार के रह जाए, तो वाइल्ड उस टाइल में चला जाता है।',
    },
  },
  bombs: {
    title: { en: 'Bomb tiles', hi: 'बम टाइलें' },
    text: {
      en: 'The number drops by one with every tap. Match the bomb before it reaches zero, or the level is lost.',
      hi: 'हर टैप के साथ अंक एक कम होता है। अंक शून्य होने से पहले बम की जोड़ी बना लें, वरना लेवल हार जाएँगे।',
    },
  },
};

/** How to play, one idea per card: the basics. */
export const RULES: { title: Bi; text: Bi }[] = [
  {
    title: { en: 'Tap a tile', hi: 'टाइल पर टैप करें' },
    text: {
      en: 'Tap a free tile to send it to the tray. A tile is free when nothing covers it and it is on an edge, with at least one side open.',
      hi: 'किसी खुली टाइल पर टैप करें, वह ट्रे में चली जाएगी। खुली टाइल वह है जिसके ऊपर कुछ न हो और जो किनारे पर हो, यानी कम से कम एक तरफ़ खाली हो।',
    },
  },
  {
    title: { en: 'Make pairs', hi: 'जोड़ियाँ बनाएँ' },
    text: { en: 'Two matching tiles in the tray clear each other.', hi: 'ट्रे में दो एक जैसी टाइलें आते ही दोनों साफ़ हो जाती हैं।' },
  },
  {
    title: { en: 'Watch the tray', hi: 'ट्रे पर नज़र रखें' },
    text: {
      en: `Unmatched tiles wait in the tray. When ${normal} are waiting (${early} in levels 1–${earlyUntilLevel}), the level is lost.`,
      hi: `बेमेल टाइलें ट्रे में इंतज़ार करती हैं। ${normal} टाइलें (लेवल 1–${earlyUntilLevel} में ${early}) इकट्ठा होते ही लेवल हार जाते हैं।`,
    },
  },
  {
    title: { en: 'Timed levels', hi: 'समय वाले लेवल' },
    text: {
      en: 'From level 60, boss levels have a clock, and from level 150 most levels do. Clear the board before it runs out.',
      hi: 'लेवल 60 से बॉस लेवल में घड़ी चलती है, और लेवल 150 से ज़्यादातर लेवल में। समय ख़त्म होने से पहले बोर्ड साफ़ करें।',
    },
  },
  {
    title: { en: 'Clear the board', hi: 'बोर्ड साफ़ करें' },
    text: { en: 'Clear every tile to win. Every level can be won.', hi: 'सारी टाइलें साफ़ करें और जीतें। हर लेवल जीता जा सकता है।' },
  },
  {
    title: { en: 'Combos', hi: 'कॉम्बो' },
    text: {
      en: 'Clear pairs quickly, one after another, for a combo and bonus coins.',
      hi: 'एक के बाद एक जल्दी-जल्दी जोड़ियाँ साफ़ करें — कॉम्बो बनेगा और बोनस सिक्के मिलेंगे।',
    },
  },
  {
    title: { en: 'Stars', hi: 'सितारे' },
    text: {
      en: 'Win without power-ups, and without letting the tray nearly fill, for three stars.',
      hi: 'बिना पावर-अप के, और ट्रे को लगभग भरने दिए बिना जीतें — तीन सितारे मिलेंगे।',
    },
  },
];

/** Power-up names: English as on the buttons, with a Hindi gloss. */
export const POWERUP_NAMES: Record<'undo' | 'hint' | 'shuffle' | 'xray' | 'extraSlot', Bi> = {
  undo: { en: 'Undo', hi: 'वापस लें' },
  hint: { en: 'Hint', hi: 'संकेत' },
  shuffle: { en: 'Shuffle', hi: 'फेरबदल' },
  xray: { en: 'X-ray', hi: 'एक्स-रे' },
  extraSlot: { en: '+1 Slot', hi: '+1 जगह' },
};

export const POWERUP_HELP: Record<'undo' | 'hint' | 'shuffle' | 'xray' | 'extraSlot', Bi> = {
  undo: { en: 'Sends the last tile in the tray back to the board.', hi: 'ट्रे की आख़िरी टाइल को बोर्ड पर वापस भेजता है।' },
  hint: { en: 'Lights up a good next move.', hi: 'अगली अच्छी चाल चमकाकर दिखाता है।' },
  shuffle: {
    en: 'Rearranges the tiles left on the board so the level can still be won.',
    hi: 'बोर्ड पर बची टाइलों को फिर से ऐसे सजाता है कि लेवल अब भी जीता जा सके।',
  },
  xray: { en: 'Shows the pictures on covered tiles for 3 seconds.', hi: 'ढकी हुई टाइलों की तस्वीरें 3 सेकंड के लिए दिखाता है।' },
  extraSlot: { en: 'Adds one more space to the tray, once per level.', hi: 'ट्रे में एक जगह और जोड़ता है, हर लेवल में एक बार।' },
};

export const POWERUP_COST: { title: Bi; text: Bi } = {
  title: { en: 'Coins', hi: 'सिक्के' },
  text: {
    en: 'Power-ups use your free charges first, then coins. Win levels to earn coins.',
    hi: 'पावर-अप पहले आपके मुफ़्त इस्तेमाल खर्च करते हैं, फिर सिक्के। सिक्के लेवल जीतकर मिलते हैं।',
  },
};

export const MODES: { title: Bi; text: Bi }[] = [
  {
    title: { en: 'Daily challenge', hi: 'रोज़ की चुनौती' },
    text: {
      en: `A new board every day. Clear it for ${CONFIG.rewards.daily} coins and keep your streak going.`,
      hi: `हर दिन एक नया बोर्ड। इसे साफ़ करें, ${CONFIG.rewards.daily} सिक्के पाएँ और रोज़ जीतने का सिलसिला बनाए रखें।`,
    },
  },
  {
    title: { en: 'Jump ahead', hi: 'आगे के लेवल पर जाएँ' },
    text: {
      en: 'On the Journey map, Jump takes you straight to level 100, 150, 200 or any level you type. Skipped levels stay open to play later.',
      hi: 'Journey मैप पर Jump दबाकर सीधे लेवल 100, 150, 200 या अपनी पसंद के किसी भी लेवल पर जाएँ। छोड़े गए लेवल बाद में भी खेले जा सकते हैं।',
    },
  },
  {
    title: { en: 'Zen', hi: 'ज़ेन' },
    text: { en: 'No tray limit. Relax and clear tiles at your own pace.', hi: 'ट्रे की कोई सीमा नहीं। आराम से, अपनी रफ़्तार से टाइलें साफ़ करें।' },
  },
];

export const HINDI_SETTING: Bi = { en: 'Show every instruction in Hindi too.', hi: 'हर निर्देश हिंदी में भी दिखाएँ।' };

export const HELP_TEXT = {
  title: { en: 'How to play', hi: 'कैसे खेलें' },
  basics: { en: 'Basics', hi: 'नियम' },
  powerups: { en: 'Power-ups', hi: 'पावर-अप' },
  specials: { en: 'Tiles', hi: 'ख़ास टाइलें' },
  modes: { en: 'Modes', hi: 'मोड' },
  back: { en: 'Back', hi: 'पीछे' },
  next: { en: 'Next', hi: 'आगे' },
  done: { en: 'Done', hi: 'हो गया' },
  fromLevel: (n: number): Bi => ({ en: `From level ${n}`, hi: `लेवल ${n} से` }),
  page: (i: number, n: number): Bi => ({ en: `${i} of ${n}`, hi: `${n} में से ${i}` }),
} as const;
