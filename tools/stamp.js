// Refreshes the content stamps on the script links in index.html (js/name.js?v=xxxxxxxx).
// Run it after editing any file in js/, so a browser never pairs the page with an older, cached script:
//   node tools/stamp.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), file = path.join(root, 'index.html');
let n = 0;
const html = fs.readFileSync(file, 'utf8').replace(/<script src="(js\/[\w.-]+\.js)(?:\?v=[0-9a-f]+)?"><\/script>/g, (m, src) => {
  n++;
  return '<script src="' + src + '?v=' + crypto.createHash('sha1').update(fs.readFileSync(path.join(root, src))).digest('hex').slice(0, 8) + '"></script>';
});
fs.writeFileSync(file, html);
console.log('stamped ' + n + ' script links in index.html');
