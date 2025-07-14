import fs from 'fs/promises';
import { readFile } from './utils/file-utils.mjs';
import path from 'path';
import { pathToFileURL } from 'url';
import { callOpenAI } from './utils/llm-api.mjs';
import { hashText } from './utils/llm-cache.mjs';
import { log } from './utils/logger.mjs';
import { sanitizeMarkdown } from './utils/sanitize-markdown.mjs';
import yaml from 'yaml';
import {
  CONTENT_DIR,
  INBOX_DIR,
  INBOX_FAILED_DIR,
  UNTAGGED_DIR,
  REVIEW_NEEDED_DIR,
} from './utils/constants.mjs';

// Discover valid content sections for classification
async function getDynamicSections() {
  const contentDir = CONTENT_DIR;
  try {
    const entries = await fs.readdir(contentDir, { withFileTypes: true });
    const sections = entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => !['inbox', 'untagged', 'review-needed'].includes(name)); // Filter out special directories
    return sections;
  } catch (err) {
    log.error(`Error reading content directory ${contentDir}:`, err.message);
    return []; // Return empty array to prevent further errors
  }
}

// Build the OpenAI prompt including the list of available sections
async function buildPrompt(content) {
  const dynamicSections = await getDynamicSections(); // Get dynamic sections
  return (
    `You are an AI assistant helping organise a Personal Intelligence Node.\n` +
    `Classify the following text into one of these sections: ${dynamicSections.join(', ')}.\n` +
    `Return JSON with keys section, tags (array), confidence (0-1), and reasoning.\n` +
    `Text:\n${content}`
  );
}

// Classify a single inbox file using the LLM
async function classifyFile(filePath) {
  let content;
  try {
    content = await readFile(filePath);
  } catch (err) {
    log.error(
      `Error reading file ${filePath} for classification:`,
      err.message
    );
    throw err; // Re-throw to be caught by main's try-catch
  }

  log.debug(`Classifying file ${filePath}`);
  const reply = await callOpenAI(await buildPrompt(content), hashText(content));
  log.debug(`Raw response for ${filePath}: ${reply}`);
  let result;
  try {
    result = JSON.parse(reply);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${reply}`);
  }

  const { section, tags, confidence, reasoning } = result;
  if (
    !section ||
    !tags ||
    confidence === undefined ||
    reasoning === undefined
  ) {
    throw new Error(
      `Malformed response, missing keys: ${JSON.stringify(result)}`
    );
  }
  if (typeof reasoning !== 'string') {
    throw new Error(`Invalid reasoning value: ${reasoning}`);
  }
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid confidence value: ${confidence}`);
  }
  if (!Array.isArray(tags)) {
    throw new Error(`Invalid tags value: ${tags}`);
  }

  return result;
}

// Move the processed file to the destination directory and write tags front matter
async function moveFile(src, destDir, tags = [], dryRun = false, extra = {}) {
  const dest = path.join(destDir, path.basename(src));

  if (dryRun) {
    log.info(`[DRY] Would move ${src} to ${dest}`);
    return dest;
  }

  try {
    await fs.mkdir(destDir, { recursive: true });
  } catch (err) {
    log.error(`Error creating destination directory ${destDir}:`, err.message);
    throw err;
  }

  let data;
  try {
    data = await readFile(src);
  } catch (err) {
    log.error(`Error reading file ${src}:`, err.message);
    throw err;
  }

  const fmObj = {};
  if (tags.length) fmObj.tags = tags;
  Object.assign(fmObj, extra);
  const fm = Object.keys(fmObj).length
    ? `---\n${yaml.stringify(fmObj)}---\n`
    : '';
  const output = sanitizeMarkdown(fm + data);

  try {
    await fs.writeFile(dest, output);
  } catch (err) {
    log.error(`Error writing file to ${dest}:`, err.message);
    try {
      await fs.unlink(dest);
    } catch (cleanupErr) {
      log.warn(`Cleanup failed for ${dest}:`, cleanupErr.message);
    }
    throw err;
  }

  try {
    await fs.unlink(src);
  } catch (err) {
    log.error(`Error removing original file ${src}:`, err.message);
    try {
      await fs.unlink(dest);
    } catch (cleanupErr) {
      log.warn(`Cleanup failed for ${dest}:`, cleanupErr.message);
    }
    throw err;
  }

  return dest;
}

// Entry point for inbox classification logic
async function main() {
  const argv = process.argv.slice(2);
  const dryIndex = argv.indexOf('--dry-run');
  const dryRun = dryIndex !== -1;
  if (dryRun) argv.splice(dryIndex, 1);

  if (!process.env.OPENAI_API_KEY) {
    log.error('OPENAI_API_KEY not set; skipping classification');
    return;
  }

  const inboxDir = INBOX_DIR;
  const failedDir = INBOX_FAILED_DIR;

  const dynamicSections = await getDynamicSections(); // Get dynamic sections for validation
  log.debug(`Available sections: ${dynamicSections.join(', ')}`);

  // Get files to process from arguments or read from inboxDir
  let filesToProcess = [];
  const args = argv; // remaining arguments after removing flag

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

  const tasks = filesToProcess.map(async (name) => {
    const filePath = path.join(inboxDir, name);
    const lockPath = `${filePath}.lock`;

    if (dryRun) {
      log.info(`[DRY] Would create lock file ${lockPath}`);
    } else {
      try {
        await fs.writeFile(lockPath, '', { flag: 'wx' });
      } catch (err) {
        if (err.code === 'EEXIST') {
          log.info(`Skipping ${filePath}; lock file exists`);
        } else {
          log.error(`Unable to create lock file ${lockPath}:`, err.message);
        }
        return;
      }
    }

    log.info(`Processing ${name}`);
    let targetDir;
    let tags = [];
    let extra = { status: 'draft' };

    try {
      const result = await classifyFile(filePath);
      if (!dynamicSections.includes(result.section)) {
        targetDir = UNTAGGED_DIR;
      } else if (result.confidence < 0.8) {
        targetDir = REVIEW_NEEDED_DIR;
        tags = result.tags || [];
        extra = {
          status: 'draft',
          confidence: result.confidence,
          reasoning: result.reasoning,
        };
      } else {
        targetDir = path.join(CONTENT_DIR, result.section);
        if (result.tags && result.tags.length) {
          tags = result.tags;
        }
      }

      const dest = await moveFile(filePath, targetDir, tags, dryRun, extra);
      if (dryRun) {
        // log inside moveFile already
      } else {
        log.info(`Moved ${name} to ${dest}`);
      }
    } catch (err) {
      log.error(`Failed to classify ${filePath}:`, err.message);
      const dest = await moveFile(filePath, failedDir, tags, dryRun);
      if (!dryRun) log.info(`Moved ${name} to ${dest}`);
    } finally {
      if (dryRun) {
        log.info(`[DRY] Would remove lock file ${lockPath}`);
      } else {
        try {
          await fs.unlink(lockPath);
        } catch (err) {
          log.error(`Error removing lock file ${lockPath}:`, err.message);
        }
      }
    }
  });

  await Promise.all(tasks);
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
