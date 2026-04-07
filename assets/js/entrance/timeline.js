// assets/js/entrance/timeline.js

export function getPhase(phaseTimes, t) {
  if (t < phaseTimes.T_HINT) return "hint";
  if (t < phaseTimes.T_BURST) return "burst";
  if (t < phaseTimes.T_DRIFT) return "drift";
  if (t < phaseTimes.T_GATHER) return "gather";
  if (t < phaseTimes.T_FLASH) return "flash";
  if (t < phaseTimes.T_LOGO) return "logo";
  return "done";
}