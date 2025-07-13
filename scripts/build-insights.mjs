import path from 'path';
import { pathToFileURL } from 'url';
import { log } from './utils/logger.mjs';
import { CONTENT_DIR, INSIGHTS_FAILED_DIR } from './utils/constants.mjs';
import {
  readFile,
  writeFile,
  readdir,
  mkdir,
  rename,
} from './utils/file-utils.mjs';
import { callOpenAI } from './utils/llm-api.mjs';
import { lint } from 'markdownlint/promise';
import { sanitizeMarkdown } from './utils/sanitize-markdown.mjs';

// Discover which content subdirectories contain notes to summarise
async function getTargetDirs() {
  const contentDir = CONTENT_DIR;
  try {
    const entries = await readdir(contentDir, { withFileTypes: true });
    return entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => !['inbox', 'untagged'].includes(name))
      .map((name) => path.join(contentDir, name));
  } catch (err) {
    log.error(`Error reading content directory ${contentDir}:`, err.message);
    return [];
  }
}

// Prompt template used when requesting a summary from the LLM
function buildSummaryPrompt(content) {
  return `Summarize the following text concisely, highlighting key insights and cross-references. Format the output as markdown.\nText:\n${content}`;
}

// Run markdownlint on the generated summary
async function validateMarkdown(text, filePath = '') {
  try {
    const results = await lint({ strings: { text } });
    return results.toString() === '';
  } catch (err) {
    const ctx = filePath ? ` for ${filePath}` : '';
    log.error(`Markdownlint error${ctx}:`, err.message);
    return false;
  }
}

// Move an input file to the failure directory if processing fails
async function moveToFailed(srcPath) {
  const failedDir = INSIGHTS_FAILED_DIR;
  try {
    await mkdir(failedDir, { recursive: true });
    const dest = path.join(failedDir, path.basename(srcPath));
    await rename(srcPath, dest);
    log.info(`Moved ${path.basename(srcPath)} to ${dest}`);
  } catch (err) {
    log.error(`Error moving file to ${failedDir}:`, err.message);
  }
}

// Generate an insight markdown file next to the source markdown
async function processMarkdownFile(filePath) {
  const content = await readFile(filePath);
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  try {
    const summary = await callOpenAI(buildSummaryPrompt(content));
    const isValid = await validateMarkdown(summary, filePath);
    if (!isValid) {
      log.error(`Invalid markdown summary for ${filePath}`);
      await moveToFailed(filePath);
      return;
    }
    const insightFileName = fileName.replace(/\.md$/, '.insight.md');
    const insightFilePath = path.join(dirName, insightFileName);
    const safeSummary = sanitizeMarkdown(summary);
    await writeFile(insightFilePath, safeSummary);
    log.info(`Generated insight for ${fileName} -> ${insightFileName}`);
  } catch (err) {
    log.error(`Failed to generate insight for ${filePath}:`, err.message);
    await moveToFailed(filePath);
  }
}

// Entry point for the insights generator
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    log.error('OPENAI_API_KEY not set; skipping insight generation');
    return;
  }

  const TARGET_DIRS = await getTargetDirs();

  // Get files to process from arguments or read from target directories
  let filesToProcess = [];
  const args = process.argv.slice(2); // Get arguments after script name

  if (args.length > 0) {
    // Arguments are provided, assume they are comma-separated file paths
    const changedFilesString = args[0];
    const changedFiles = changedFilesString
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    // Filter for files that are markdown and within target directories
    for (const changedFile of changedFiles) {
      const absolutePath = path.resolve(changedFile); // Resolve to absolute path
      const isMarkdown =
        absolutePath.endsWith('.md') && !absolutePath.endsWith('.insight.md');
      const isInTargetDir = TARGET_DIRS.some((dir) =>
        absolutePath.startsWith(path.resolve(dir) + path.sep)
      );

      if (isMarkdown && isInTargetDir) {
        filesToProcess.push(absolutePath);
      }
    }

    if (filesToProcess.length === 0) {
      log.info('No relevant changed markdown files to process.');
      return;
    }
  } else {
    // No arguments, process all files in target directories
    for (const dir of TARGET_DIRS) {
      try {
        const files = await readdir(dir);
        const markdownFiles = files.filter(
          (file) => file.endsWith('.md') && !file.endsWith('.insight.md')
        );
        for (const file of markdownFiles) {
          filesToProcess.push(path.join(dir, file));
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          log.warn(`Directory not found: ${dir}. Skipping.`);
        } else {
          log.error(`Error processing directory ${dir}:`, err.message);
        }
      }
    }
    if (filesToProcess.length === 0) {
      log.info('No markdown files to process.');
      return;
    }
  }

  const tasks = filesToProcess.map((filePath) =>
    processMarkdownFile(filePath).catch((err) => {
      log.error(`Error processing ${filePath}:`, err.message);
    })
  );
  await Promise.all(tasks);
  log.info('Insight generation complete.');
}

export {
  main,
  buildSummaryPrompt,
  processMarkdownFile,
  getTargetDirs,
  validateMarkdown,
  moveToFailed,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('build-insights main error:', err);
    process.exit(1);
  });
}
