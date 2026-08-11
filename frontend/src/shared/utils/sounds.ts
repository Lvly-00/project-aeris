const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function beep(frequency: number, duration: number, volume: number, startTime: number) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playAlertSound(severity: string) {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  const now = audioCtx.currentTime;

  switch (severity) {
    case "Critical":
      beep(880, 0.15, 0.3, now);
      beep(880, 0.15, 0.3, now + 0.25);
      beep(880, 0.15, 0.3, now + 0.5);
      beep(660, 0.3, 0.25, now + 0.8);
      break;
    case "High":
      beep(660, 0.15, 0.25, now);
      beep(660, 0.15, 0.25, now + 0.3);
      break;
    case "Medium":
      beep(440, 0.2, 0.2, now);
      break;
    default:
      beep(330, 0.15, 0.12, now);
      break;
  }
}
