// Extracts the game script from ../index.html into tests/core.js so the simulation can run headless in Node.
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/<script>\n([\s\S]*?)<\/script>/);
if(!m)throw new Error('game script not found');
fs.writeFileSync(path.join(__dirname,'core.js'),m[1]);
console.log('core.js written');
