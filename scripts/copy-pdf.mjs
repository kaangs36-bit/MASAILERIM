import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('www', { recursive: true });
copyFileSync('node_modules/pdfmake/build/pdfmake.min.js', 'www/pdfmake.min.js');
copyFileSync('node_modules/pdfmake/build/vfs_fonts.js', 'www/vfs_fonts.js');
