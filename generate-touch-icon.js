import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'src/assets/Logo_LifePilot-solo.png');
const outputDir = path.join(__dirname, 'public');

async function generateTouchIcon() {
  try {
    await sharp(inputPath)
      .resize(180, 180, { fit: 'cover' })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));

    console.log('✅ Apple Touch Icon generiert: apple-touch-icon.png');
  } catch (err) {
    console.error('❌ Fehler:', err.message);
    process.exit(1);
  }
}

generateTouchIcon();
