/**
 * GENERATED FILE -- DO NOT EDIT BY HAND.
 *
 * Source of truth: scla/sports/rugby/referee_gestures.py in the SCLA repo,
 * whose descriptions are derived from laws.REFEREE_SIGNALS (Laws of the
 * Game 2026, Match Official Signals).
 *
 * Regenerate:
 *   python scripts/export_gesture_taxonomy.py --out ../scla-labelling/lib/gestures.ts
 *
 * Verify (CI / pre-push):
 *   python scripts/export_gesture_taxonomy.py --check ../scla-labelling/lib/gestures.ts
 *
 * Editing this file by hand is how the taxonomies drifted apart for four
 * months: the app kept twelve classes and pre-Laws wording while SCLA moved
 * to ten. A wrong description is the dangerous half -- it yields a VALID
 * code on the wrong frame, which no validator downstream can catch.
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
    description: "Shoulders parallel with the touchline; arm angled up, pointing towards the non-offending team.",
    lawCitation: "Law 20",
    when: "Penalty awarded. Arm angled UP; advantage holds the arm waist-high instead.",
  },
  {
    code: "scrum",
    description: "Shoulders parallel with the touchline; arm horizontal, pointing to the team throwing in.",
    lawCitation: "Law 19",
    when: "Scrum awarded -- usually after a knock-on, throw forward, or an unplayable ruck or maul.",
  },
  {
    code: "knock_on",
    description: "Arm outstretched with open hand above the head, moving backwards and forwards.",
    lawCitation: "Law 11",
    when: "Secondary signal shown before the scrum signal: ball travelled forward off a player's hand or arm.",
  },
  {
    code: "forward_pass",
    description: "Hands gesture as if passing an imaginary ball forward.",
    lawCitation: "Law 11",
    when: "Secondary signal shown before the scrum signal: ball thrown forward.",
  },
  {
    code: "try_awarded",
    description: "Referee's back to the dead-ball line; arm raised vertically.",
    lawCitation: "Law 8",
    when: "Try or penalty try awarded; the referee's back is to the dead-ball line.",
  },
  {
    code: "advantage",
    description: "Arm outstretched, waist high, towards the non-offending team, held for about five seconds.",
    lawCitation: "Law 7",
    when: "Play continues after an infringement. Arm WAIST-HIGH and held for about five seconds; penalty is angled up.",
  },
  {
    code: "free_kick",
    description: "Shoulders parallel with the touchline; arm bent square at the elbow, upper arm pointing to the non-offending team.",
    lawCitation: "Law 20",
    when: "Free-kick awarded: scrum or lineout infringement, or a mark (Law 17.3 awards a mark as a free-kick).",
  },
  {
    code: "held_up",
    description: "Space between the hands shows the ball was not grounded.",
    lawCitation: "Law 21.16",
    when: "Ball-carrier held up in-goal and unable to ground the ball; play restarts with a drop-out or 5 m scrum.",
  },
  {
    code: "time_off",
    description: "Arms form a T shape.",
    lawCitation: "Law 5.5",
    when: "Referee stops the clock -- injury, TMO referral, or similar stoppage.",
  },
  {
    code: "card_yellow_or_red",
    description: "A yellow card shown to the cautioned player; or a red card shown to the sent-off player.",
    lawCitation: "Law 9.29-9.30",
    when: "Sin-bin (yellow) or send-off (red) for foul play.",
  },
] as const;

export const NONE_CODE = "none";

/** One key per class, in GESTURES order. "n" is reserved for NONE_CODE. */
export const KEY_BINDINGS: readonly string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/**
 * Codes that existed in an earlier taxonomy. Kept only so a stale
 * client's submission can be recognised and refused rather than
 * silently stored; null means the class was dropped outright.
 */
export const RETIRED_CODES: Readonly<Record<string, string | null>> = {
  "mark": "free_kick",
  "lineout": null,
};

const VALID = new Set<string>([...GESTURES.map((g) => g.code), NONE_CODE]);

export function isValidCode(code: string): boolean {
  return VALID.has(code);
}
