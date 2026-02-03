import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'rollup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => {

    return {
        root: mode === 'production' ? path.resolve(__dirname, 'example') : path.resolve(__dirname, '../'),
        base: '',
        build: {
            sourcemap: true,
            outDir: path.resolve(__dirname, './example/bundle/'),
            rollupOptions: {
                input: fs
                    .readdirSync(path.resolve(__dirname, './example/'))
                    .filter(p => /\.html$/.test(p))
                    .map(p => path.resolve(__dirname, `./example/${ p }`)),
            },
        },
    };

} );
