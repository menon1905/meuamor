const fs = require('fs');
const content = fs.readFileSync('leitor-livros-3d/js/libs/page-flip.browser.js', 'utf8');

const sIdx = content.indexOf('boundsRect={');
console.log(content.substring(sIdx - 150, sIdx + 150));
