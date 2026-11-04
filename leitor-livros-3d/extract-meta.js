const fs = require('fs');
const path = require('path');
const pdfjsLib = require('./leitor-livros-3d/js/libs/pdf.min.js');

async function inspectPDF() {
    const data = new Uint8Array(fs.readFileSync('leitor-livros-3d/books/nao-e-como-nos-filmes.pdf'));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    console.log('Total pages:', doc.numPages);
    
    const outline = await doc.getOutline();
    console.log('Outline exists:', !!outline);
    if (outline) {
        console.log('Outline items:', outline.length);
        console.log('Outline preview:', JSON.stringify(outline.slice(0, 10), null, 2));
    }

    const meta = await doc.getMetadata();
    console.log('Metadata:', meta.info);
}

inspectPDF().catch(console.error);
