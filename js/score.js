/* Pylon's score: music that is written while it plays. Web Audio only, with no samples and no files.

   It is built the way a large game scores itself: not one looping track but layers that follow the play.
   - Every floor has a theme: its own key and mode, chord progression, bell, arpeggio and pulse. The keys climb with the
     tower, from D Dorian on the Boot Deck to D major at the Summit Core.
   - One five-note motif, the tower's signal, is stated in every theme and takes that theme's colour.
   - The tower starts almost silent: wind, two open notes and the signal. Bass, full chords, arpeggios, a slow lead voice,
     pulse and a high shimmer come in as levels are solved and floors come back online.
   - Inside a level the mix pulls back so that it is easy to think. A failed run dims the sound for a moment, a passed one
     is answered by the bells, a floor coming online brings the motif back in octaves.

   The engine only schedules notes a short time ahead (pump), so every change is heard within about half a second.
   create(ctx, destination, opts) works on a live AudioContext and on an OfflineAudioContext, which is how it is tested. */
(function (root) {
'use strict';
const MODES = { ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], aeolian: [0, 2, 3, 5, 7, 8, 10] };
const BPM = 72, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4, SPAN = 32;        // a chord lasts two bars: 32 sixteenths
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

// tonic: 0 is C. prog: the chords, as steps of the mode. bell: [ratio of the two sine waves, brightness, seconds of ring].
// arp: which note of the chord each slot plays (null rests), div: sixteenths to a slot. pulse: 0 none, 1 a heartbeat, 2 driving.
// key: how many semitones the game's sound effects are moved so that they sit in the theme's key.
const THEMES = [
  { name: 'Scratchpad', tonic: 2, mode: 'dorian', prog: [0, 6, 3, 0, 0, 2, 6, 3], bright: 0.85, hollow: false, detune: 6, bell: [2, 1.2, 2.8], arp: [0, null, null, null, 2, null, null, null], div: 2, pulse: 0, key: 0 },
  { name: 'Boot Deck', tonic: 2, mode: 'dorian', prog: [0, 6, 3, 0, 0, 2, 6, 3], bright: 0.9, hollow: false, detune: 6, bell: [2, 1.4, 2.8], arp: [0, null, 2, null, 4, null, 2, null], div: 2, pulse: 0, key: 0 },
  { name: 'Logic Gardens', tonic: 5, mode: 'lydian', prog: [0, 1, 2, 1, 0, 6, 5, 1], bright: 1.15, hollow: false, detune: 7, bell: [3, 0.9, 2.2], arp: [0, 2, 1, 3, 2, 4, 3, 5], div: 2, pulse: 0, key: 0 },
  { name: 'Cipher Hall', tonic: 9, mode: 'aeolian', prog: [0, 5, 2, 6, 0, 3, 5, 4], bright: 0.75, hollow: true, detune: 5, bell: [3.5, 2.2, 3.4], arp: [0, null, null, 3, null, 2, null, null], div: 2, pulse: 0, key: 0 },
  { name: 'Data Vaults', tonic: 4, mode: 'dorian', prog: [0, 2, 6, 3, 0, 4, 2, 3], bright: 0.95, hollow: false, detune: 7, bell: [2, 1.2, 2.4], arp: [0, 2, 4, 2, 1, 3, 5, 3], div: 1, pulse: 1, key: 2 },
  { name: 'Signal Archive', tonic: 11, mode: 'aeolian', prog: [0, 2, 5, 3, 0, 6, 5, 5], bright: 0.7, hollow: false, detune: 11, bell: [1, 0.8, 4], arp: [0, null, null, null, 2, null, null, null], div: 2, pulse: 0, key: 2 },
  { name: 'Pattern Forge', tonic: 6, mode: 'dorian', prog: [0, 3, 6, 0, 2, 3, 4, 3], bright: 1.25, hollow: false, detune: 7, bell: [2, 2, 1.8], arp: [0, null, 2, 0, null, 3, null, 2, 0, null, 4, null, 3, null, 2, null], div: 1, pulse: 2, key: 4 },
  { name: 'Structure Works', tonic: 9, mode: 'lydian', prog: [0, 1, 2, 1, 0, 4, 5, 1], bright: 1.1, hollow: false, detune: 8, bell: [4, 1.2, 3.2], arp: [0, 4, 2, 5, 1, 4, 3, 5], div: 2, pulse: 1, key: 4 },
  { name: 'Path Reactor', tonic: 11, mode: 'dorian', prog: [0, 4, 2, 3, 0, 6, 3, 3], bright: 1, hollow: true, detune: 8, bell: [1.5, 2.4, 2], arp: [0, 4, 0, 4, 0, 4, 2, 4], div: 1, pulse: 2, key: -3 },
  { name: 'Summit Core', tonic: 2, mode: 'ionian', prog: [0, 4, 5, 3, 0, 3, 4, 4], bright: 1.35, hollow: false, detune: 9, bell: [2, 1.6, 3.2], arp: [0, 2, 4, 5, 4, 2, 3, 1], div: 2, pulse: 1, key: 2 },
];
// The tower's signal: five notes, as steps of whatever mode the floor is in. The answer rises where the signal settles.
const MOTIF = { steps: [0, 4, 5, 4, 2], answer: [2, 4, 5, 7, 4], at: [0, 4, 8, 14, 16], beats: [1, 1, 1.5, 0.5, 3], weight: [0.9, 0.8, 1, 0.7, 0.85] };
// How loud each layer is when it is fully in.
const LEVEL = { pad: 0.66, bass: 0.36, bell: 1.5, arp: 1.6, lead: 0.85, perc: 0.75, air: 0.36, shimmer: 1.1 };

function prng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// The note of a pitch class (0 to 11) that lies closest to a MIDI number.
function nearest(pc, to) {
  const down = to - (((to - pc) % 12) + 12) % 12;
  return to - down > 6 ? down + 12 : down;
}
// Move a note by octaves until it lies inside a range, so it keeps its name.
function fit(m, lo, hi) { while (m < lo) m += 12; while (m > hi) m -= 12; return m; }
const ORDERS = {};
function orders(n) {                                // every order of n voices, for choosing the smoothest way into a chord
  if (ORDERS[n]) return ORDERS[n];
  const out = [], go = (done, rest) => { if (!rest.length) out.push(done); rest.forEach((x, i) => go(done.concat(x), rest.slice(0, i).concat(rest.slice(i + 1)))); };
  go([], Array.from({ length: n }, (x, i) => i));
  return ORDERS[n] = out;
}

function create(ctx, dest, opts) {
  opts = opts || {};
  const lite = !!opts.lite, log = opts.log || null, rand = prng(opts.seed || 20261111), rate = ctx.sampleRate;
  const jitter = () => (rand() - 0.5) * 0.012;      // nobody plays exactly on the grid
  const panner = v => { if (!ctx.createStereoPanner) return null; const p = ctx.createStereoPanner(); p.pan.value = v; return p; };
  const join = (...nodes) => { const real = nodes.filter(Boolean); for (let i = 0; i < real.length - 1; i++) real[i].connect(real[i + 1]); return real[real.length - 1]; };
  const done = (source, ...nodes) => { source.onended = () => { for (const n of nodes) { try { n.disconnect(); } catch (e) { /* already gone */ } } }; };

  // ---- sound shapes
  const partials = (n, amp) => { const re = new Float32Array(n + 1), im = new Float32Array(n + 1); for (let k = 1; k <= n; k++) im[k] = amp(k); return ctx.createPeriodicWave(re, im); };
  const WAVE = {
    soft: partials(lite ? 8 : 14, k => 1 / Math.pow(k, 1.55)),                       // a saw with the edge taken off
    hollow: partials(lite ? 7 : 13, k => (k % 2 ? 1 / Math.pow(k, 1.35) : 0.05 / k)),   // mostly odd partials: woody
    pluck: partials(10, k => (k % 2 ? 1 / k : 0.35 / k)),
  };
  function noiseBuffer(seconds, pink) {
    const n = Math.floor(rate * seconds), buf = ctx.createBuffer(1, n, rate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      if (pink) { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w;
    }
    return buf;
  }
  // The room: noise that dies away, with the high end dying first. Each side gets its own noise, which makes it wide.
  function impulse(seconds) {
    const n = Math.floor(rate * seconds), buf = ctx.createBuffer(2, n, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n, k = 0.72 * Math.pow(1 - x, 1.7) + 0.07;
        y += ((rand() * 2 - 1) - y) * k;
        d[i] = y * Math.exp(-6.2 * x) * (i < 96 ? i / 96 : 1);
      }
    }
    return buf;
  }

  // ---- the path every sound takes: layers -> mix -> tone -> compressor -> out
  const out = ctx.createGain(), comp = ctx.createDynamicsCompressor(), tone = ctx.createBiquadFilter(), rumble = ctx.createBiquadFilter(), sheen = ctx.createBiquadFilter(), mix = ctx.createGain();
  out.gain.value = 0;
  mix.gain.value = 0.72;
  sheen.type = 'highshelf'; sheen.frequency.value = 3400; sheen.gain.value = 4;      // a little air on top: the instruments are all soft-edged
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3; comp.attack.value = 0.03; comp.release.value = 0.35;
  tone.type = 'lowpass'; tone.frequency.value = 17000; tone.Q.value = 0.5;
  rumble.type = 'highpass'; rumble.frequency.value = 28;
  join(mix, tone, sheen, rumble, comp, out, dest);
  const verbIn = ctx.createGain(), verbLow = ctx.createBiquadFilter(), pre = ctx.createDelay(0.1), verb = ctx.createConvolver(), verbOut = ctx.createGain();
  verbLow.type = 'highpass'; verbLow.frequency.value = 210;        // low notes stay out of the room, or it turns to mud
  pre.delayTime.value = 0.024;
  verb.buffer = impulse(lite ? 2.3 : 3.8);
  verbOut.gain.value = 0.62;
  join(verbIn, verbLow, pre, verb, verbOut, mix);
  // An echo that crosses from one side to the other, a dotted eighth apart, losing its edge on the way.
  const echoIn = ctx.createGain(), tapA = ctx.createDelay(1.5), tapB = ctx.createDelay(1.5), again = ctx.createGain(), dull = ctx.createBiquadFilter(), thin = ctx.createBiquadFilter(), echoOut = ctx.createGain(), echoVerb = ctx.createGain();
  tapA.delayTime.value = tapB.delayTime.value = BEAT * 0.75;
  again.gain.value = 0.36; dull.type = 'lowpass'; dull.frequency.value = 2600; thin.type = 'highpass'; thin.frequency.value = 280;
  echoOut.gain.value = 0.5; echoVerb.gain.value = 0.3;
  echoIn.connect(tapA); join(tapA, dull, thin, tapB, again, tapA);
  join(tapA, panner(-0.6), echoOut); join(tapB, panner(0.6), echoOut);
  echoOut.connect(mix); join(echoOut, echoVerb, verbIn);
  function layer(dry, wet, echo) {                  // one fader for a layer, feeding the mix, the room and the echo
    const g = ctx.createGain(), d = ctx.createGain();
    g.gain.value = 0; d.gain.value = dry;
    join(g, d, mix);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; join(g, w, verbIn); }
    if (echo) { const e = ctx.createGain(); e.gain.value = echo; join(g, e, echoIn); }
    return g;
  }
  const B = { pad: layer(0.75, 0.55), bass: layer(1, 0.04), bell: layer(0.6, 0.75, 0.55), arp: layer(0.7, 0.4, 0.45), lead: layer(0.4, 0.9, 0.2), perc: layer(1, 0.12), air: layer(0.7, 0.5), shimmer: layer(0.3, 1) };
  // Pads: one filter for each side, drifting apart and together very slowly, and a gain the pulse can press down.
  const padL = ctx.createBiquadFilter(), padR = ctx.createBiquadFilter(), duck = ctx.createGain(), drift = ctx.createOscillator(), driftL = ctx.createGain(), driftR = ctx.createGain();
  for (const f of [padL, padR]) { f.type = 'lowpass'; f.Q.value = 0.6; f.frequency.value = 2000; }
  join(padL, panner(-0.55), duck); join(padR, panner(0.55), duck); duck.connect(B.pad);
  drift.frequency.value = 0.057; driftL.gain.value = 420; driftR.gain.value = -420;
  join(drift, driftL, padL.frequency); join(drift, driftR, padR.frequency);
  // Wind around the tower.
  const airSrc = ctx.createBufferSource(), airBand = ctx.createBiquadFilter(), gust = ctx.createOscillator(), gustDepth = ctx.createGain();
  airSrc.buffer = noiseBuffer(3.1, true); airSrc.loop = true;
  airBand.type = 'bandpass'; airBand.frequency.value = 520; airBand.Q.value = 0.55;
  gust.frequency.value = 0.043; gustDepth.gain.value = 260;
  join(gust, gustDepth, airBand.frequency); join(airSrc, airBand, B.air);
  const hiss = noiseBuffer(1, false);

  // ---- what the game tells the score, and where the music is
  const st = { floor: 1, lit: true, scene: 'hub', solved: 0, online: 0, tense: false };
  let theme = THEMES[1], pending = null, fanfare = false, started = false, pos = 0, nextT = 0, theme0 = 0, chordK = -1, chord = null;
  let voicing = [], arpNotes = [], melody = [], quietUntil = 0, lastBell = 76, bellBefore = 0, lastLead = 72, cycle = 0, finale = 0, mixNow = {}, onTheme = opts.onTheme || null;
  const note = (t, name, midi, dur, vel) => { if (log) log.push({ t: +t.toFixed(3), layer: name, midi, dur: +dur.toFixed(2), vel: +vel.toFixed(2) }); };

  // ---- instruments
  function padNote(t, midi, dur, peak, into, wave) {
    const f = hz(midi), unease = st.scene === 'hunt' ? 9 : 0;
    for (let side = 0; side < 2; side++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.setPeriodicWave(wave);
      o.frequency.value = f;
      o.detune.value = (side ? 1 : -1) * (theme.detune + unease) + (rand() - 0.5) * 3;
      g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(peak, t, 0.55); g.gain.setTargetAtTime(0, t + dur, 0.8);
      o.connect(g); g.connect(into || (side ? padR : padL));
      o.start(t); o.stop(t + dur + 5.2);
      done(o, g);
    }
  }
  function bassNote(t, midi, dur, vel, short) {
    const o = ctx.createOscillator(), up = ctx.createOscillator(), upGain = ctx.createGain(), lowGain = ctx.createGain(), g = ctx.createGain(), tail = short ? 0.09 : 0.3;
    o.type = 'sine'; o.frequency.value = hz(midi); lowGain.gain.value = 0.55;
    up.type = 'triangle'; up.frequency.value = hz(midi + 12); upGain.gain.value = 0.5;        // an octave above, so small speakers still carry it
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.03); g.gain.setTargetAtTime(vel * 0.7, t + 0.03, short ? 0.08 : 0.5); g.gain.setTargetAtTime(0, t + dur, tail);
    join(o, lowGain, g); join(up, upGain, g); g.connect(B.bass);
    const end = t + dur + tail * 7;
    o.start(t); up.start(t); o.stop(end); up.stop(end);
    done(o, g, upGain, lowGain);
    note(t, 'bass', midi, dur, vel);
  }
  // A bell: one sine wave bending the pitch of another. The bend dies quickly, the ring slowly.
  function bell(t, midi, vel, dur, shape, into) {
    const sh = shape || theme.bell, f = hz(midi), car = ctx.createOscillator(), mod = ctx.createOscillator(), bend = ctx.createGain(), g = ctx.createGain(), side = panner((rand() - 0.5) * 0.9);
    const ring = Math.max(0.4, dur * 0.35 + sh[2]), soft = Math.min(1, 1500 / f);            // high notes ring shorter and softer
    car.frequency.value = f; mod.frequency.value = f * sh[0];
    bend.gain.setValueAtTime(f * sh[1], t); bend.gain.exponentialRampToValueAtTime(Math.max(0.5, f * sh[1] * 0.04), t + 0.45);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.3 * soft), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    join(mod, bend, car.frequency); join(car, g, side, into || B.bell);
    car.start(t); mod.start(t); car.stop(t + ring + 0.05); mod.stop(t + ring + 0.05);
    done(car, g, bend, side);
    note(t, into ? 'cue' : 'bell', midi, dur, vel);
  }
  function pluck(t, midi, vel, side) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner(side);
    o.setPeriodicWave(WAVE.pluck); o.frequency.value = hz(midi);
    f.type = 'lowpass'; f.Q.value = 1.6; f.frequency.setValueAtTime(Math.min(9000, hz(midi) * 6), t); f.frequency.exponentialRampToValueAtTime(Math.max(300, hz(midi) * 1.2), t + 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.2), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    join(o, f, g, p, B.arp);
    o.start(t); o.stop(t + 0.6);
    done(o, f, g, p);
    note(t, 'arp', midi, 0.25, vel);
  }
  // A slow voice with a little vibrato, mostly heard through the room.
  function leadNote(t, midi, dur, vel) {
    const o = ctx.createOscillator(), wob = ctx.createOscillator(), depth = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = hz(midi);
    wob.frequency.value = 4.6; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(hz(midi) * 0.004, t + 1.4);
    f.type = 'lowpass'; f.frequency.value = Math.min(6000, hz(midi) * 3); f.Q.value = 0.4;
    g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(vel * 0.14, t, 0.4); g.gain.setTargetAtTime(0, t + dur, 0.6);
    join(wob, depth, o.frequency); join(o, f, g, B.lead);
    const end = t + dur + 4;
    o.start(t); wob.start(t); o.stop(end); wob.stop(end);
    done(o, f, g, depth);
    note(t, 'lead', midi, dur, vel);
  }
  function kick(t, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(105, t); o.frequency.exponentialRampToValueAtTime(41, t + 0.13);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    join(o, g, B.perc);
    o.start(t); o.stop(t + 0.4);
    done(o, g);
    // the pads lean back for a moment under the pulse
    duck.gain.setValueAtTime(1, t); duck.gain.linearRampToValueAtTime(0.78, t + 0.02); duck.gain.setTargetAtTime(1, t + 0.05, 0.14);
    note(t, 'kick', 36, 0.3, vel);
  }
  function hat(t, vel, ring) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner((rand() - 0.5) * 0.5);
    s.buffer = hiss;
    f.type = 'highpass'; f.frequency.value = 7200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.3), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    join(s, f, g, p, B.perc);
    s.start(t, rand() * 0.8); s.stop(t + ring + 0.02);
    done(s, f, g, p);
    note(t, 'hat', 90, ring, vel);
  }
  function tick(t, vel) {                           // the interview clock
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1480, t); o.frequency.exponentialRampToValueAtTime(1180, t + 0.03);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.09, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    join(o, g, B.perc);
    o.start(t); o.stop(t + 0.07);
    done(o, g);
    note(t, 'tick', 90, 0.05, vel);
  }
  function swell(t, seconds) {                      // air rushing up into a big moment
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = hiss; s.loop = true;
    f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5200, t + seconds);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + seconds); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.5);
    join(s, f, g, B.shimmer);
    s.start(t); s.stop(t + seconds + 0.6);
    done(s, f, g);
  }

  // ---- harmony
  // The four notes of the chord on a step of the mode: root, fifth, third, and a colour (the ninth, or the seventh where
  // the ninth would sit a semitone above the root and grate).
  function chordOn(deg) {
    const sc = MODES[theme.mode], pc = k => (theme.tonic + sc[(deg + k) % 7]) % 12, second = (sc[(deg + 1) % 7] - sc[deg % 7] + 12) % 12;
    return { deg, root: pc(0), fifth: pc(4), third: pc(2), colour: second === 2 ? pc(1) : pc(6) };
  }
  // Place the chord's notes so that each voice moves as little as possible from where it was.
  const HOMES = { 2: [57, 64], 3: [52, 59, 64], 4: [52, 59, 64, 69] };      // two bare notes sit higher, where they stay clear
  function voice(c, count) {
    const HOME = HOMES[count], pcs = [c.root, c.fifth, c.third, c.colour].slice(0, count), was = voicing.length === count ? voicing : HOME;
    let best = null, least = Infinity;
    for (const order of orders(count)) {
      const notes = order.map((which, j) => fit(nearest(pcs[which], was[j]), 47, 79));
      let cost = 0;
      for (let j = 0; j < count; j++) cost += Math.abs(notes[j] - was[j]) + 0.3 * Math.abs(notes[j] - HOME[j]);       // the pull home stops the chords creeping upward
      for (let j = 1; j < count; j++) if (notes[j] <= notes[j - 1]) cost += 7;          // voices that cross or share a note thin the chord
      if (order[0] > 1) cost += 3;                  // root or fifth at the bottom keeps it steady
      if (cost < least) { least = cost; best = notes; }
    }
    return best.slice().sort((a, b) => a - b);
  }
  // A step of the mode as a MIDI note, counted from a given tonic.
  const stepNote = (base, d) => base + MODES[theme.mode][((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

  // ---- the mix: which layers are in, from what the player has done
  function mixFor() {
    const n = st.online, hub = st.scene === 'hub';
    const m = { pad: 1, bass: st.solved >= 1 ? 1 : 0, bell: 1, arp: 0, lead: 0, perc: 0, air: Math.max(0.25, 1 - n / 11), shimmer: 0 };
    if (hub) {
      m.arp = n >= 1 ? 0.9 : 0;
      m.lead = n >= 3 ? 1 : 0;
      m.perc = theme.pulse ? (n >= 4 ? 1 : 0) : (n >= 6 ? 0.5 : 0);
      m.shimmer = n >= 7 ? 1 : 0;
    } else {                                        // inside a level: room to think
      m.pad = 0.8; m.bass *= 0.7; m.bell = 0.5; m.air *= 0.5;
      m.arp = n >= 1 ? 0.4 : 0;
      m.perc = st.scene === 'clock' ? 0.8 : theme.pulse === 2 && n >= 4 ? 0.3 : 0;
    }
    if (finale > 0) { m.pad = m.bass = m.bell = m.arp = m.lead = m.shimmer = 1; m.perc = 0.9; m.air = 0.25; }
    if (opts.solo) for (const k in m) if (k !== opts.solo) m[k] = 0;          // the bench listens to one layer at a time
    return m;
  }
  const openTone = () => (st.scene === 'hub' && !st.lit && finale <= 0 ? 2600 : st.scene === 'hunt' ? 9000 : 17000);     // a dark floor sounds far away
  function applyMix(when) {
    mixNow = mixFor();
    for (const k in B) { if (started) B[k].gain.setTargetAtTime(mixNow[k] * LEVEL[k], when, 0.45); else B[k].gain.setValueAtTime(mixNow[k] * LEVEL[k], when); }
    const open = openTone(), cut = 2000 * theme.bright * (st.scene === 'hub' ? 1 : 0.85);
    if (started) { tone.frequency.setTargetAtTime(open, when, 0.6); padL.frequency.setTargetAtTime(cut, when, 1.2); padR.frequency.setTargetAtTime(cut * 1.12, when, 1.2); }
    else { tone.frequency.setValueAtTime(open, when); padL.frequency.setValueAtTime(cut, when); padR.frequency.setValueAtTime(cut * 1.12, when); }
  }
  const padVoices = () => (finale > 0 || st.solved >= 5 ? 4 : st.solved >= 2 ? 3 : 2);

  // ---- writing the music, one sixteenth at a time
  function switchTheme(p, t) {
    theme = pending; pending = null;
    theme0 = p; chordK = -1; melody = []; quietUntil = 0;
    applyMix(t);
    if (onTheme) onTheme(theme);
  }
  function startChord(k, p, t) {
    chordK = k;
    const n = theme.prog.length, idx = ((k % n) + n) % n;
    if (idx === 0) cycle++;
    chord = chordOn(theme.prog[idx]);
    chord.idx = idx;
    const dur = (theme0 + (k + 1) * SPAN - p) * STEP, count = padVoices();      // to the next chord, even when this one starts late
    voicing = voice(chord, count);
    arpNotes = Array.from(new Set(voicing.concat(voicing.map(m => m + 12)).map(m => m + 12))).filter(m => m >= 60 && m <= 88).sort((a, b) => a - b);
    const wave = theme.hollow ? WAVE.hollow : WAVE.soft, peak = 0.085 * (count === 2 ? 1.5 : count === 3 ? 1.2 : 1);
    voicing.forEach(m => { padNote(t, m, dur, peak * (m < 52 ? 0.85 : 1), null, wave); note(t, 'pad', m, dur, peak); });
    if (mixNow.shimmer > 0.01) for (const m of voicing.slice(-2)) padNote(t, m + 24, dur, 0.03, B.shimmer, WAVE.soft);
    if (mixNow.bass > 0.01 && !(theme.pulse === 2 && mixNow.perc > 0.01)) bassNote(t, fit(nearest(chord.root, 38), 33, 44), dur * 0.92, 0.34, false);
    if (mixNow.lead > 0.01 && rand() < 0.72) {
      const pc = rand() < 0.6 ? chord.third : chord.colour, m = fit(nearest(pc, lastLead), 64, 81);
      lastLead = m;
      leadNote(t + BEAT, m, dur * 0.62, 0.8);
    }
  }
  // The signal, stated: plain (0), an octave lower (1), the answer (2), or doubled in octaves for a big moment (3).
  function statement(p, kind) {
    const base = nearest(theme.tonic, kind === 1 ? 64 : 74), steps = kind === 2 ? MOTIF.answer : MOTIF.steps;      // kind 1 is the signal an octave lower, warm and far off
    MOTIF.at.forEach((at, i) => {
      const m = stepNote(base, steps[i]), vel = MOTIF.weight[i] * (kind === 1 ? 0.7 : 0.95);
      melody.push({ at: p + at, midi: m, vel, dur: MOTIF.beats[i] * BEAT });
      if (kind === 3) melody.push({ at: p + at, midi: m + 12, vel: vel * 0.6, dur: MOTIF.beats[i] * BEAT });
    });
    lastBell = stepNote(base, steps[steps.length - 1]);
    quietUntil = p + SPAN;
  }
  // Between statements: a few single bells from the chord, close to the last one, mostly on the strong beats.
  function sprinkle(p) {
    const density = (st.scene === 'hub' ? 0.5 + st.online * 0.05 : 0.3) * (finale > 0 ? 1.4 : 1), pcs = [chord.root, chord.third, chord.fifth, chord.colour];
    for (let beat = 0; beat < 4; beat++) {
      if (rand() >= density * [0.34, 0.12, 0.26, 0.12][beat]) continue;
      let best = 0, score = -Infinity;
      for (const pc of pcs) for (const centre of [lastBell - 5, lastBell + 4]) {
        const m = nearest(pc, centre), s = -Math.abs(m - lastBell) * 0.5 - Math.abs(m - 79) * 0.25 - (m === lastBell ? 3 : 0) - (m === bellBefore ? 2.5 : 0) + rand() * 5;      // not the same note again, and no see-sawing between two
        if (m >= 69 && m <= 91 && s > score) { score = s; best = m; }
      }
      if (!best) continue;
      bellBefore = lastBell; lastBell = best;
      melody.push({ at: p + beat * 4 + (rand() < 0.18 ? 2 : 0), midi: best, vel: 0.4 + rand() * 0.3, dur: (2 + Math.floor(rand() * 3)) * BEAT });
    }
  }
  function planBar(p) {
    const first = (p - theme0) % SPAN === 0;
    if (first && chord.deg === 0 && fanfare) { fanfare = false; statement(p, 3); return; }
    const calm = st.scene !== 'hub' && finale <= 0;
    if (first && chord.deg === 0 && chord.idx === 0 && !(calm && cycle % 2 === 0)) statement(p, cycle % 2 ? 0 : 1);
    else if (first && chord.deg === 0 && chord.idx === 4 && !calm) statement(p, 2);
    else if (p >= quietUntil) sprinkle(p);
  }
  function arpStep(p, t) {
    if (!(mixNow.arp > 0.01) || p % theme.div || !arpNotes.length) return;
    const slot = Math.floor((p - theme0) / theme.div) % theme.arp.length, which = theme.arp[slot];
    if (which == null) return;
    const accent = p % 4 === 0 ? 1 : p % 2 === 0 ? 0.8 : 0.62;
    pluck(t + jitter(), arpNotes[which % arpNotes.length], accent * (0.75 + rand() * 0.25), slot % 2 ? 0.32 : -0.32);
  }
  function pulseStep(p, t) {
    if (!(mixNow.perc > 0.01)) return;
    const s = p % 16, clock = st.scene === 'clock' && finale <= 0, kind = clock ? 3 : theme.pulse || 1;
    if (kind === 3) {                                // an interview: a clock, and a faster one when time runs short
      if (s % (st.tense ? 2 : 4) === 0) tick(t, s % 8 === 0 ? 1 : 0.6);
      if (s === 0) kick(t, 0.7);
      if (st.tense && s % 4 === 2) hat(t, 0.5, 0.035);
      return;
    }
    if (kind === 1) {                                // a heartbeat
      if (s === 0) kick(t, 0.8); else if (s === 10) kick(t, 0.45);
      if (s === 4 || s === 12) hat(t + jitter(), 0.4, 0.05);
      return;
    }
    if (s === 0 || s === 8) kick(t, s ? 0.75 : 0.95); else if (s === 11) kick(t, 0.35);
    if (s % 4 === 2) hat(t + jitter(), 0.75, 0.045); else if (s % 2) hat(t + jitter(), 0.28, 0.025);
    if (s === 14) hat(t, 0.5, 0.16);
    // the bass takes the pulse too: eighth notes on the root, lifting to the fifth at the end of the bar
    if (mixNow.bass > 0.01 && s % 2 === 0) bassNote(t, fit(nearest(s >= 12 ? chord.fifth : chord.root, 38), 33, 44), STEP * 1.5, s % 4 ? 0.2 : 0.3, true);
  }
  function step(p, t) {
    if (p % 16 === 0) {
      if (finale > 0 && --finale === 0) { pending = THEMES[st.floor] || THEMES[1]; }
      if (pending) switchTheme(p, t);
    }
    const k = Math.floor((p - theme0) / SPAN);
    if (k !== chordK) startChord(k, p, t);
    if (p % 16 === 0) planBar(p);
    for (let i = melody.length - 1; i >= 0; i--) {
      if (melody[i].at > p) continue;
      const n = melody.splice(i, 1)[0];
      if (n.at === p && mixNow.bell > 0.01) bell(t + jitter(), n.midi, n.vel, n.dur);
    }
    arpStep(p, t);
    pulseStep(p, t);
  }
  // Schedule everything up to a moment. Called a few times a second with a moment a little in the future.
  function pump(until) {
    if (!started) return;
    const now = ctx.currentTime;
    if (nextT < now + 0.01) {                       // fell behind (the page was busy or asleep): pick up from here, on the grid
      const missed = Math.ceil((now + 0.04 - nextT) / STEP);
      pos += missed; nextT += missed * STEP;
    }
    while (nextT < until) { step(pos, nextT); pos++; nextT += STEP; }
  }

  // ---- what the game can do
  function set(next, when) {
    const t = when == null ? ctx.currentTime : when, floor = next && next.floor != null ? next.floor : st.floor;
    Object.assign(st, next || {});
    const want = THEMES[floor] || THEMES[1];
    if (finale <= 0) {
      if (!started) { theme = want; pending = null; }
      else pending = want !== theme ? want : null;
    }
    applyMix(t);
  }
  // A moment in the game that the music answers.
  function cue(name, when) {
    if (!started) return;
    const now = when == null ? ctx.currentTime : when, c = chord || chordOn(0);
    if (name === 'fail') {                          // the sound dims, then comes back
      tone.frequency.cancelScheduledValues(now);
      tone.frequency.setTargetAtTime(480, now, 0.06);
      tone.frequency.setTargetAtTime(openTone(), now + 0.8, 0.7);
      bell(now + 0.06, nearest(c.root, 50), 0.9, 2.5, [1, 0.5, 2.6], B.bell);
    } else if (name === 'pass') {                   // the bells run up the chord that is sounding
      const pcs = [c.root, c.third, c.fifth, c.colour];
      let m = nearest(c.root, 71);
      for (let i = 0; i < 6; i++) {
        bell(now + 0.42 + i * STEP * 0.75, m, 0.5 + i * 0.07, 2, null, B.bell);
        let up = 128;
        for (const pc of pcs) { const cand = nearest(pc, m + 6); if (cand > m && cand < up) up = cand; }
        m = up > 127 ? m + 12 : up;
      }
    } else if (name === 'rank') {                   // a floor comes online: air rushes up and the signal returns in octaves
      swell(now, 1.7);
      pending = pending || theme; fanfare = true;
    } else if (name === 'ending') {                 // the summit: everything, in D major, for a minute and a half
      swell(now, 2.2);
      finale = 28; pending = THEMES[9]; fanfare = true;
      applyMix(now);
    }
  }
  function start(when) {
    if (started) return;
    const t = when == null ? ctx.currentTime + 0.08 : when;
    for (const source of [drift, gust, airSrc]) { if (!source.on) { source.start(t); source.on = true; } }
    pos = 0; nextT = t; theme0 = 0; chordK = -1; melody = []; quietUntil = 0;
    if (pending) { theme = pending; pending = null; }
    applyMix(t);
    started = true;
    if (onTheme) onTheme(theme);
  }
  function stop() { started = false; }               // notes already on their way ring out; nothing new is written
  function volume(v, when, seconds) {
    const t = when == null ? ctx.currentTime : when;
    if (seconds) out.gain.setTargetAtTime(v, t, seconds / 3); else out.gain.setValueAtTime(v, t);
  }
  return { set, cue, start, stop, pump, volume, get theme() { return theme; }, get playing() { return started; }, get position() { return pos; }, state: st };
}

root.PylonScore = { create, THEMES, MODES, MOTIF, BPM, BAR, STEP, nearest, fit };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonScore;
})(typeof window !== 'undefined' ? window : globalThis);
