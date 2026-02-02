import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

export default {

	// Serve from urdf-loaders root so ../../../urdf/ paths work correctly
	root: path.resolve( __dirname, '../' ),
	base: '',
	build: {
		sourcemap: true,
		outDir: path.resolve( __dirname, './example/bundle/' ),
		rollupOptions: {
			input: fs
				.readdirSync( path.resolve( __dirname, './example/' ) )
				.filter( p => /\.html$/.test( p ) )
				.map( p => path.resolve( __dirname, `./example/${ p }` ) ),
		},
	},
	server: {
		open: '/javascript/example/index.html',
	},

};
