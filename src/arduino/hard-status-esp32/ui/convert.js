const fs = require('fs');
const file = process.argv.pop();
const data = fs.readFileSync(file);
const bytes = [];
for(const b of data) bytes.push(b);
const list = bytes.join(',');
console.log(`const char indexhtml[] = {${list}};`);