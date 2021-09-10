import path from 'path';

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
                format: 'umd',
                file: outputPath,
                sourcemap: true,

                globals: path => /^three/.test(path) ? 'THREE' : null,

            },

        };
    }),
];
