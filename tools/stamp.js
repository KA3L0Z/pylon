// Refreshes the content stamps on the script links in index.html (js/name.js?v=xxxxxxxx), and then the file list and the
// version in sw.js, the worker that keeps the offline copy: it has to name exactly the same stamped scripts as the page.
// Run it after editing any file in js/, so a browser never pairs the page with an older, cached script:
//   node tools/stamp.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), file = path.join(root, 'index.html'), swFile = path.join(root, 'sw.js');
const sha = data => crypto.createHash('sha1').update(data).digest('hex');
const srcs = [];
const html = fs.readFileSync(file, 'utf8').replace(/<script src="(js\/[\w.-]+\.js)(?:\?v=[0-9a-f]+)?"><\/script>/g, (m, src) => {
  const stamped = src + '?v=' + sha(fs.readFileSync(path.join(root, src))).slice(0, 8);
  srcs.push(stamped);
  return '<script src="' + stamped + '"></script>';
});
fs.writeFileSync(file, html);
console.log('stamped ' + srcs.length + ' script links in index.html');
if (fs.existsSync(swFile)) {
  let sw = fs.readFileSync(swFile, 'utf8');
  const list = /^const CORE = (\[.*\]);$/m.exec(sw);
  if (!list || !/^const VERSION = "[0-9a-f]+";$/m.test(sw)) throw new Error('sw.js: the CORE list or the VERSION line was not found');
  const core = JSON.parse(list[1]).filter(u => !/^js\//.test(u)).concat(srcs);
  sw = sw.replace(list[0], () => 'const CORE = ' + JSON.stringify(core) + ';');
  sw = sw.replace(/^const VERSION = "[0-9a-f]+";$/m, () => 'const VERSION = ' + JSON.stringify(sha(html + JSON.stringify(core)).slice(0, 10)) + ';');
  fs.writeFileSync(swFile, sw);
  console.log('sw.js now lists ' + core.length + ' files for the offline copy');
}
