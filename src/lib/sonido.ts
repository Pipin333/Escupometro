/**
 * Reproduce un sonido de alarma / sirena industrial usando Web Audio API.
 * No requiere archivos externos y funciona sin dependencias.
 */
export function reproducirAlarmaReinicio(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.35);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.7);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch {
    // Si el navegador bloquea audio sin interacción previa, falla silenciosamente
  }
}
