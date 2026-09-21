import {copyFile} from 'node:fs/promises';
await copyFile('node_modules/pdfmake/build/pdfmake.min.js','www/pdfmake.min.js');
await copyFile('node_modules/pdfmake/build/vfs_fonts.js','www/vfs_fonts.js');
await copyFile('node_modules/xlsx/dist/xlsx.full.min.js','www/xlsx.full.min.js');
console.log('Rapor motorları hazır.');
