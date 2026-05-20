/**
 * Referee gesture taxonomy -- mirrors scla/sports/rugby/referee_gestures.py
 * in the SCLA repo. The two files MUST stay in lock-step; the pull script
 * (scripts/pull_labelling_results.py in SCLA) validates incoming labels
 * against the canonical list and rejects unknown codes.
 *
 * If you add a class here, add it to the SCLA module in the same PR.
 */

export interface GestureClass {
  code: string;
  description: string;
  lawCitation: string;
  when: string;
}

export const GESTURES: readonly GestureClass[] = [
  {
    code: "penalty",
    description:
      "Arm extended at 45 degrees in the direction of the non-offending team's advantage.",
    lawCitation: "Law 9.6",
    when: "Foul-play call awarding a penalty kick or penalty options.",
  },
  {
    code: "scrum",
    description:
      "Bent-arm rotation followed by an open hand pointing at the mark.",
    lawCitation: "Law 19",
    when:
      "Scrum awarded -- usually after a knock-on, forward pass, or lineout-not-straight.",
  },
  {
    code: "lineout",
    description:
      "Arm extended horizontally above the head, parallel to the touchline.",
    lawCitation: "Law 18",
    when:
      "Lineout awarded after the ball goes out over the touchline (not a quick throw-in).",
  },
  {
    code: "knock_on",
    description:
      "Open hand moves forward then sweeps down -- mimicking the ball going forward.",
    lawCitation: "Law 11",
    when: "Ball-handling error: ball travels forward off the player's hand or arm.",
  },
  {
    code: "forward_pass",
    description:
      "Open hand sweeps horizontally across the body in the direction of the pass.",
    lawCitation: "Law 12",
    when:
      "Pass thrown forward of the passer's position relative to their own goal line.",
  },
  {
    code: "try_awarded",
    description:
      "Arm raised vertically upward toward the in-goal where the try was scored.",
    lawCitation: "Law 8",
    when: "Ball grounded over or on the try line by an attacking player.",
  },
  {
    code: "advantage",
    description:
      "Arm held at 45 degrees -- same position as penalty, but sustained while play continues.",
    lawCitation: "Law 7.1",
    when:
      "Non-offending team has the ball in space after an infringement; referee is letting play run.",
  },
  {
    code: "free_kick",
    description:
      "Bent arm (elbow at 90 deg) raised in the direction of the awarded team's advantage.",
    lawCitation: "Law 9.9",
    when: "Minor offence -- e.g. scrum infringement or 50:22-style scenarios.",
  },
  {
    code: "mark",
    description:
      "Caught ball + raised arm + a called 'mark!'; referee gestures by holding the arm up.",
    lawCitation: "Law 14",
    when: "Defender catches a kick inside their 22 and calls for a mark.",
  },
  {
    code: "held_up",
    description: "Crossed forearms held above the head.",
    lawCitation: "Law 8.3",
    when: "Attacking ball-carrier prevented from grounding the ball over the try line.",
  },
  {
    code: "time_off",
    description: "T-shape made with both hands (one horizontal, one vertical).",
    lawCitation: "Law 5.7",
    when:
      "Referee stops the clock -- injury, TMO referral, or scoring-out review.",
  },
  {
    code: "card_yellow_or_red",
    description:
      "One hand drawn from the chest/pocket carrying a coloured card, then raised.",
    lawCitation: "Law 9.28",
    when: "Sin-bin (yellow) or send-off (red) for foul play.",
  },
] as const;

export const NONE_CODE = "none";

/** Number-key bindings: 1-9 for the first 9 classes, then 0, q, w. */
export const KEY_BINDINGS: readonly string[] = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w",
];

const VALID = new Set<string>([...GESTURES.map((g) => g.code), NONE_CODE]);

export function isValidCode(code: string): boolean {
  return VALID.has(code);
}
