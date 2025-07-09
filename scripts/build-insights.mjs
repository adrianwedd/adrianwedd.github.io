import path from 'path';
import { pathToFileURL } from 'url';
import { callOpenAI } from './classify-inbox.mjs'; // Reusing callOpenAI
import { log } from './utils/logger.mjs';
import { readFile, writeFile, readdir } from './utils/file-utils.mjs';

const TARGET_DIRS = [
  path.join('content', 'garden'),
  path.join('content', 'logs'),
  path.join('content', 'mirror'),
];

function buildSummaryPrompt(content) {
  return `Summarize the following text concisely, highlighting key insights and cross-references. Format the output as markdown.\nText:\n${content}`;
}

async function processMarkdownFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  try {
    const summary = await callOpenAI(buildSummaryPrompt(content));
    const insightFileName = fileName.replace(/\.md$/, '.insight.md');
    const insightFilePath = path.join(dirName, insightFileName);
    await writeFile(insightFilePath, summary);
    log.info(`Generated insight for ${fileName} -> ${insightFileName}`);
  } catch (err) {
    log.error(`Failed to generate insight for ${fileName}:`, err.message);
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    log.error('OPENAI_API_KEY not set; skipping insight generation');
    return;
  }

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
        absolutePath.startsWith(dir + path.sep)
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

  for (const filePath of filesToProcess) {
    await processMarkdownFile(filePath);
  }
  log.info('Insight generation complete.');
}

export { main, buildSummaryPrompt, processMarkdownFile };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error(err);
    process.exit(1);
  });
}
