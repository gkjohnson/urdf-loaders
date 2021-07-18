import path from 'path';
import resolve from '@rollup/plugin-node-resolve';

const files = {
    URDFLoader: 'URDFLoader.js',
    URDFViewer: 'urdf-viewer-element.js',
    URDFManipulator: 'urdf-manipulator-element.js',
};

const isExternal = p => {

    return !!(/^three/.test(p) || Object.values(files).filter(f => p.indexOf(f) !== -1).length);

};

export default [
    // libraries
    ...Object.entries(files).map(([name, file]) => {

        const inputPath = path.join(__dirname, `./src/${ file }`);
        const outputPath = path.join(__dirname, `./umd/${ file }`);

        return {

            input: inputPath,
            treeshake: false,
            external: p => isExternal(p),

            output: {

                name,
                extend: true,
                format: 'es',
                file: outputPath,
                sourcemap: true,
                inlineDynamicImports: true,

                globals: path => /^three/.test(path) ? 'THREE' : null,

            },

        };
    }),

    // examples
    {
        input: './example/src/index.js',
        plugins: [resolve()],
        output: {
            file: './example/bundle/index.js',
            format: 'es',
            inlineDynamicImports: true,
            sourcemap: true,
        },
    },
    {
        input: './example/src/vr.js',
        plugins: [resolve()],
        output: {
            file: './example/bundle/vr.js',
            format: 'es',
            inlineDynamicImports: true,
            sourcemap: true,
        },
    },
    {
        input: './example/src/simple.js',
        plugins: [resolve()],
        output: {
            file: './example/bundle/simple.js',
            format: 'es',
            inlineDynamicImports: true,
            sourcemap: true,
        },
    },
];
