import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'src/assets/Logo_LifePilot-solo.png');
const outputDir = path.join(__dirname, 'public');

async function generateIcons() {
  try {
    // 192x192 Icon
    await sharp(inputPath)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(path.join(outputDir, 'pwa-192x192.png'));

    // 512x512 Icon
    await sharp(inputPath)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(outputDir, 'pwa-512x512.png'));

    console.log('✅ Icons generiert: pwa-192x192.png, pwa-512x512.png');
  } catch (err) {
    console.error('❌ Fehler beim Generieren der Icons:', err.message);
    process.exit(1);
  }
}

generateIcons();
