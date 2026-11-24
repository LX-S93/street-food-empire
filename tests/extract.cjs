// Bundles src/game.ts (with its locale JSON) into tests/core.js so the simulation runs headless in Node.
const path = require('path'), esbuild = require('esbuild');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'src', 'game.ts')],
  bundle: true, format: 'cjs', platform: 'node', target: 'node18',
  outfile: path.join(__dirname, 'core.js'), logLevel: 'warning',
});
console.log('core.js written');
