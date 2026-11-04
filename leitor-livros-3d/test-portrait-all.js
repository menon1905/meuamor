const fs = require('fs');
const content = fs.readFileSync('leitor-livros-3d/js/libs/page-flip.browser.js', 'utf8');

const matches = [];
let idx = 0;
while ((idx = content.indexOf('portrait', idx)) !== -1) {
    matches.push(content.substring(idx - 40, idx + 200));
    idx += 30;
}
console.log('Total portrait references:', matches.length);
matches.forEach((m, i) => console.log(`[${i}]`, m.replace(/\n/g, ' ')));
