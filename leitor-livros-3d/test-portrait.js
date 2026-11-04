const fs = require('fs');
const content = fs.readFileSync('leitor-livros-3d/js/libs/page-flip.browser.js', 'utf8');

let pos = 0;
while ((pos = content.indexOf('"portrait"===this.orientation', pos)) !== -1) {
    console.log('--- MATCH AT', pos, '---');
    console.log(content.substring(pos - 40, pos + 250));
    pos += 25;
}
