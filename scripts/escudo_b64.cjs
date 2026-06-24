const fs = require('fs');
const path = require('path');
const data = fs.readFileSync(path.join(__dirname, '../public/escudo.webp'));
console.log('data:image/webp;base64,' + data.toString('base64'));
