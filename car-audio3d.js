const ENGINE_LEVEL = 0.07;
const IDLE_RATE = .9;
const ENGINE_SAMPLE = new URL('./car-engine-loop.wav?v=20261119f', import.meta.url);

export function createCarAudio(onStop) {
 const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
 let active = null;

 function stop(loadFailed = false) {
  if (!active) return;
  const {context, output, loading} = active;
  active = null;
  loading.abort();
  context.onstatechange = null;
  output.disconnect();
  if (context.state !== 'closed') context.close().catch(() => {});
  onStop(loadFailed);
 }

 function start() {
  if (!Audio) return false;
  let context;
  try {
   context = new Audio();
   const engine = context.createBufferSource();
   const output = context.createGain();
   const loading = new AbortController();
   engine.loop = true;
   engine.playbackRate.value = IDLE_RATE;
   output.gain.value = 0;
   engine.connect(output);
   output.connect(context.destination);
   active = {context, engine, output, loading};
   let running = context.state === 'running';
   context.onstatechange = () => {
    if (active?.context !== context) return;
    if (context.state === 'running') running = true;
    else if (running || context.state !== 'suspended') stop();
   };
   // Called directly from the sound button so Safari can unlock playback.
   const unlocked = context.resume();
   const recording = fetch(ENGINE_SAMPLE, {signal: loading.signal}).then(response => {
    if (!response.ok) throw new Error('Engine sound could not be loaded');
    return response.arrayBuffer();
   }).then(bytes => context.decodeAudioData(bytes));
   Promise.all([unlocked, recording]).then(([, buffer]) => {
    if (active?.context !== context || context.state !== 'running') return;
    engine.buffer = buffer;
    engine.start();
    output.gain.setTargetAtTime(ENGINE_LEVEL, context.currentTime, .035);
   }).catch(() => {
    if (active?.context === context) stop(true);
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
  const rate = IDLE_RATE + 1.1 * speed + .24 * load;
  engine.playbackRate.setTargetAtTime(rate, context.currentTime, .12);
 }

 return {start, stop, update, get enabled() { return active !== null; }};
}
