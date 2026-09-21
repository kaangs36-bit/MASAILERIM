import {copyFile} from 'node:fs/promises';
await copyFile('node_modules/pdfmake/build/pdfmake.min.js','www/pdfmake.min.js');
await copyFile('node_modules/pdfmake/build/vfs_fonts.js','www/vfs_fonts.js');
await copyFile('node_modules/exceljs/dist/exceljs.min.js','www/exceljs.min.js');
console.log('Rapor motorları hazır.');
