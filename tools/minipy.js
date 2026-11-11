// Loads MiniPy in Node (the browser loads the same five files with script tags).
const path = require('path');
for (const f of ['minipy-core.js', 'minipy-parse.js', 'minipy-compile.js', 'minipy-lib.js', 'minipy-mods.js']) {
  require(path.join(__dirname, '..', 'js', f));
}
module.exports = globalThis.MiniPy;
