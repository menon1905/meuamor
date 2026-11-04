const fs = require('fs');
const content = fs.readFileSync('leitor-livros-3d/js/libs/page-flip.browser.js', 'utf8');

const matches = [];
let idx = 0;
while ((idx = content.indexOf('getBlockWidth', idx)) !== -1) {
    matches.push(content.substring(idx - 60, idx + 250));
    idx += 20;
}
console.log('Found', matches.length, 'matches');
if (matches[0]) console.log('Match 0:\n', matches[0]);
