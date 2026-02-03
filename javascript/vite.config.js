import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const input = {};
const files = fs.readdirSync(path.resolve(__dirname, './example/')).filter(p => /\.html$/.test(p));
files.forEach(file => {
    input[file] = path.resolve(__dirname, `./example/${ file }`);
});

export default {

    // Serve from urdf-loaders root so ../../../urdf/ paths work correctly
    root: path.resolve(__dirname, '../'),
    base: '',
    build: {
        sourcemap: true,
        outDir: path.resolve(__dirname, './example/bundle/'),
        rollupOptions: { input },
    },
    server: {
        open: '/javascript/example/index.html',
    },

};
