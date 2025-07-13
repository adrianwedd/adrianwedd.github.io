import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = dirname(fileURLToPath(import.meta.url));

const alias = {
  '@': resolve(root, 'src'),
  '@scripts': resolve(root, 'scripts'),
  '@content': resolve(root, 'content'),
};

export default alias;
