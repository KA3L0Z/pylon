// Checks the plot (js/saga.js): every level has its line of story, and every scene can be played to its end.
//   node tools/check_story.js
const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');
globalThis.window = globalThis;
globalThis.PYLON_LEVELS = [];
for (const f of fs.readdirSync(path.join(rootDir, 'js')).filter(f => /^levels-z\d+\.js$/.test(f)).sort()) require(path.join(rootDir, 'js', f));
if (fs.existsSync(path.join(rootDir, 'js', 'toolcards.js'))) require(path.join(rootDir, 'js', 'toolcards.js'));
const Curriculum = require('../js/curriculum.js'), Saga = require('../js/saga.js');
const levels = Curriculum.arrange(globalThis.PYLON_LEVELS).levels, floors = Curriculum.FLOORS.length, errors = [];

for (const l of levels) {
  const m = Saga.MISSIONS[l.id];
  if (!m) errors.push(l.id + ': no line of story');
  else if (m.length < 60 || m.length > 330) errors.push(l.id + ': its line of story is ' + m.length + ' characters (60 to 330 reads well above a briefing)');
  if (l.kind === 'code' && !(l.lesson && l.lesson.length > 200)) errors.push(l.id + ': no briefing to open on');
}
for (const id of Object.keys(Saga.MISSIONS)) if (!levels.some(l => l.id === id)) errors.push('a line of story for ' + id + ', which is not a level');
for (let f = 1; f <= floors; f++) {
  if (!Saga.SCENES['f' + f + 's']) errors.push('floor ' + f + ' has no opening scene');
  if (f < floors && !Saga.SCENES['f' + f + 'e']) errors.push('floor ' + f + ' has no closing scene');
}
if (!Saga.SCENES.summit) errors.push('no scene at the summit');

// Choices are made in the order the scenes are played; a line may only depend on a choice that was offered before it.
const order = [], offered = {};
for (let f = 1; f <= floors; f++) order.push('f' + f + 's', 'f' + f + 'e');
order.push('summit');
let lines = 0;
for (const id of order) {
  const scene = Saga.SCENES[id];
  if (!scene) continue;
  let said = 0;
  for (const l of scene) {
    if (l.choice) {
      if (!l.q || !Array.isArray(l.opts) || l.opts.length < 2 || l.opts.some(o => !/^[a-z]{1,10}$/.test(o[0]) || !o[1])) errors.push(id + ': the choice "' + l.choice + '" is not well formed');
      offered[l.choice] = l.opts.map(o => o[0]);
      continue;
    }
    lines++;
    if (typeof l.t !== 'string' || !l.t.trim()) errors.push(id + ': an empty line');
    if (Saga.WHO[l.w || ''] === undefined) errors.push(id + ': nobody is called "' + l.w + '"');
    if (l.on && !offered[l.on]) errors.push(id + ': a line depends on the choice "' + l.on + '", which has not been offered yet');
    else if (l.on && offered[l.on].indexOf(l.is) < 0) errors.push(id + ': a line waits for "' + l.is + '", which "' + l.on + '" cannot be');
    if (!l.on) said++;
  }
  // whatever was chosen, something is said
  for (const key of Object.keys(offered)) for (const v of offered[key]) if (!scene.some(l => !l.choice && (!l.on || (l.on === key && l.is === v)))) errors.push(id + ': nothing is said when ' + key + ' is ' + v);
  if (!said) errors.push(id + ': every line depends on a choice');
}
for (const key of Object.keys(Saga.REPLY)) if (!offered.end || offered.end.indexOf(key) < 0) errors.push('a reply for the ending "' + key + '", which cannot be chosen');
for (const v of offered.end || []) if (!Saga.REPLY[v]) errors.push('no reply for the ending "' + v + '"');

console.log(levels.length + ' levels with a line of story, ' + Object.keys(Saga.SCENES).length + ' scenes, ' + lines + ' lines, ' + Object.keys(offered).length + ' choices');
for (const e of errors.slice(0, 40)) console.log('ERROR: ' + e);
console.log(errors.length + ' errors');
process.exit(errors.length ? 1 : 0);
