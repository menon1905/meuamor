const fs = require('fs');

const w = 600;
const h = 880;

const blockW = w;
const blockH = h;
const e = blockW, i = e / 2, s = blockH / 2;
const left = i - w / 2 - w;
const rightPageX = left + w;

console.log('blockW:', blockW);
console.log('e.left:', left);
console.log('rightPageX (where page sits):', rightPageX);
console.log('top:', s - h / 2);
