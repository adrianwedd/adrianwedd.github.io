import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { callOpenAI } from './utils/llm-api.mjs';
import { log } from './utils/logger.mjs';
import { sanitizeMarkdown } from './utils/sanitize-markdown.mjs';

// Function to dynamically discover content sections
async function getDynamicSections() {
  const contentDir = path.join('content');
  try {
    const entries = await fs.readdir(contentDir, { withFileTypes: true });
    const sections = entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => !['inbox', 'untagged'].includes(name)); // Filter out special directories
    return sections;
  } catch (err) {
    log.error(`Error reading content directory ${contentDir}:`, err.message);
    return []; // Return empty array to prevent further errors
  }
}

async function buildPrompt(content) {
  const dynamicSections = await getDynamicSections(); // Get dynamic sections
  return (
    `You are an AI assistant helping organise a Personal Intelligence Node.\n` +
    `Classify the following text into one of these sections: ${dynamicSections.join(', ')}.\n` +
    `Return JSON with keys section, tags (array), and confidence (0-1).\n` +
    `Text:\n${content}`
  );
}

async function classifyFile(filePath) {
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    log.error(
      `Error reading file ${filePath} for classification:`,
      err.message
    );
    throw err; // Re-throw to be caught by main's try-catch
  }

  log.debug(`Classifying file ${filePath}`);
  const reply = await callOpenAI(await buildPrompt(content));
  log.debug(`Raw response for ${filePath}: ${reply}`);
  let result;
  try {
    result = JSON.parse(reply);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${reply}`);
  }

  const { section, tags, confidence } = result;
  if (!section || !tags || confidence === undefined) {
    throw new Error(
      `Malformed response, missing keys: ${JSON.stringify(result)}`
    );
  }
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid confidence value: ${confidence}`);
  }
  if (!Array.isArray(tags)) {
    throw new Error(`Invalid tags value: ${tags}`);
  }

  return result;
}

async function moveFile(src, destDir, tags = []) {
  try {
    await fs.mkdir(destDir, { recursive: true });
  } catch (err) {
    log.error(`Error creating destination directory ${destDir}:`, err.message);
    throw err;
  }

  const dest = path.join(destDir, path.basename(src));
  let data;
  try {
    data = await fs.readFile(src, 'utf8');
  } catch (err) {
    log.error(`Error reading file ${src}:`, err.message);
    throw err;
  }

  const fm = tags.length ? `---\ntags: [${tags.join(', ')}]\n---\n` : '';
  const output = sanitizeMarkdown(fm + data);

  try {
    await fs.writeFile(dest, output);
  } catch (err) {
    log.error(`Error writing file to ${dest}:`, err.message);
    try {
      await fs.unlink(dest);
    } catch {}
    throw err;
  }

  try {
    await fs.unlink(src);
  } catch (err) {
    log.error(`Error removing original file ${src}:`, err.message);
    try {
      await fs.unlink(dest);
    } catch {}
    throw err;
  }

  return dest;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    log.error('OPENAI_API_KEY not set; skipping classification');
    return;
  }

  const inboxDir = path.join('content', 'inbox');
  const failedDir = path.join(inboxDir, 'failed');

  const dynamicSections = await getDynamicSections(); // Get dynamic sections for validation
  log.debug(`Available sections: ${dynamicSections.join(', ')}`);

  // Get files to process from arguments or read from inboxDir
  let filesToProcess = [];
  const args = process.argv.slice(2); // Get arguments after script name

  if (args.length > 0) {
    // Arguments are provided, assume they are comma-separated file paths
    const changedFilesString = args[0];
    const changedFiles = changedFilesString
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    // Filter for files that are actually in the inbox directory
    let allInboxFiles = [];
    try {
      allInboxFiles = (await fs.readdir(inboxDir)).filter(
        (f) => f !== '.gitkeep' && f !== 'failed'
      );
    } catch (err) {
      log.error(`Error reading inbox directory ${inboxDir}:`, err.message);
      return; // Cannot proceed without reading inbox
    }

    filesToProcess = changedFiles.filter(
      (f) =>
        allInboxFiles.includes(path.basename(f)) && path.dirname(f) === inboxDir
    );

    if (filesToProcess.length === 0) {
      log.info('No relevant changed inbox files to process.');
      return;
    }
  } else {
    // No arguments, process all files in inbox
    try {
      filesToProcess = (await fs.readdir(inboxDir)).filter(
        (f) => f !== '.gitkeep' && f !== 'failed'
      );
    } catch (err) {
      log.error(`Error reading inbox directory ${inboxDir}:`, err.message);
      return; // Cannot proceed without reading inbox
    }

    if (filesToProcess.length === 0) {
      log.info('No inbox files to process.');
      return;
    }
  }

  for (const name of filesToProcess) {
    const filePath = path.join(inboxDir, name);
    const lockPath = `${filePath}.lock`;

    try {
      await fs.writeFile(lockPath, '', { flag: 'wx' });
    } catch (err) {
      if (err.code === 'EEXIST') {
        log.info(`Skipping ${filePath}; lock file exists`);
      } else {
        log.error(`Unable to create lock file ${lockPath}:`, err.message);
      }
      continue;
    }

    log.info(`Processing ${name}`);
    let targetDir;
    let tags = [];

    try {
      const result = await classifyFile(filePath);
      // Use dynamicSections for validation
      if (
        dynamicSections.includes(result.section) &&
        result.confidence >= 0.8
      ) {
        targetDir = path.join('content', result.section);
        if (result.tags && result.tags.length) {
          tags = result.tags;
        }
      } else {
        targetDir = path.join('content', 'untagged');
      }

      const dest = await moveFile(filePath, targetDir, tags);
      log.info(`Moved ${name} to ${dest}`);
    } catch (err) {
      log.error(`Failed to classify ${filePath}:`, err.message);
      const dest = await moveFile(filePath, failedDir, tags);
      log.info(`Moved ${name} to ${dest}`);
    } finally {
      try {
        await fs.unlink(lockPath);
      } catch (err) {
        log.error(`Error removing lock file ${lockPath}:`, err.message);
      }
    }
  }
}

export {
  buildPrompt,
  callOpenAI,
  classifyFile,
  moveFile,
  main,
  getDynamicSections,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('classify-inbox main error:', err);
    process.exit(1);
  });
}
