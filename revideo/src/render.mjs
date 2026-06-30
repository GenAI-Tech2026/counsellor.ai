import {renderVideo} from '@revideo/renderer';

// Renders the project to ../public/product-video.mp4 (the file the landing page scrubs).
const file = await renderVideo({
  projectFile: './src/project.ts',
  settings: {
    logProgress: true,
    outFile: 'product-video.mp4',
    outDir: '../public',
  },
});

console.log(`\n✓ Rendered counsa product video to: ${file}`);
