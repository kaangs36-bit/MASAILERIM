import sharp from 'sharp';
await sharp('resources/icon.svg').resize(1024,1024).png().toFile('resources/icon.png');
console.log('MRL Hakediş simgesi hazır.');
