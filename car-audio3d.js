// A single normalized waveform keeps the peak level bounded at every pitch.
const ENGINE_LEVEL = 0.035;
const HARMONICS = new Float32Array([0, 1, .45, .26, .14, .08]);

export function createCarAudio(onStop) {
 const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
 let active = null;

 function stop() {
  if (!active) return;
  const {context, output} = active;
  active = null;
  context.onstatechange = null;
  output.disconnect();
  if (context.state !== 'closed') context.close().catch(() => {});
  onStop();
 }

 function start() {
  if (!Audio) return false;
  let context;
  try {
   context = new Audio();
   const engine = context.createOscillator();
   const output = context.createGain();
   engine.setPeriodicWave(context.createPeriodicWave(new Float32Array(HARMONICS.length), HARMONICS));
   engine.frequency.value = 48;
   output.gain.value = 0;
   engine.connect(output);
   output.connect(context.destination);
   active = {context, engine, output};
   let running = context.state === 'running';
   context.onstatechange = () => {
    if (active?.context !== context) return;
    if (context.state === 'running') running = true;
    else if (running || context.state !== 'suspended') stop();
   };
   engine.start();
   // Called directly from the sound button so Safari can unlock playback.
   context.resume().then(() => {
    if (active?.context !== context || context.state !== 'running') return;
    output.gain.setTargetAtTime(ENGINE_LEVEL, context.currentTime, .035);
   }).catch(() => {
    if (active?.context === context) stop();
   });
   return true;
  } catch {
   if (active && active.context === context) stop();
   else if (context && context.state !== 'closed') context.close().catch(() => {});
   return false;
  }
 }

 function update(speedFraction, throttle) {
  if (!active || active.context.state !== 'running') return;
  const {context, engine} = active;
  const speed = Math.max(0, Math.min(1, speedFraction));
  const load = Math.min(1, Math.abs(throttle));
  const frequency = 48 + 105 * speed + 28 * load;
  engine.frequency.setTargetAtTime(frequency, context.currentTime, .09);
 }

 return {start, stop, update, get enabled() { return active !== null; }};
}
