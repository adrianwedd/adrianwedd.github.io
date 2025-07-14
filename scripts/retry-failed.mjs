import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { log } from './utils/logger.mjs';
import {
  INBOX_FAILED_DIR,
  INSIGHTS_FAILED_DIR,
  CONTENT_DIR,
  UNTAGGED_DIR,
  REVIEW_NEEDED_DIR,
} from './utils/constants.mjs';
import {
  classifyFile,
  moveFile,
  getDynamicSections,
} from './classify-inbox.mjs';
import { processMarkdownFile } from './build-insights.mjs';

async function processInboxFailed(dryRun = false) {
  let files;
  try {
    files = await fs.readdir(INBOX_FAILED_DIR);
  } catch (err) {
    log.error(`Error reading ${INBOX_FAILED_DIR}:`, err.message);
    return;
  }

  if (files.length === 0) return;

  const dynamicSections = await getDynamicSections();

  await Promise.all(
    files
      .filter((f) => f !== '.gitkeep')
      .map(async (name) => {
        const filePath = path.join(INBOX_FAILED_DIR, name);
        try {
          const result = await classifyFile(filePath);
          let targetDir;
          let tags = [];
          let extra = { status: 'draft' };
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
            if (result.tags && result.tags.length) tags = result.tags;
          }
          const dest = await moveFile(filePath, targetDir, tags, dryRun, extra);
          log.info(`Reclassified ${name} -> ${dest}`);
        } catch (err) {
          log.error(`Retry classify failed for ${filePath}:`, err.message);
        }
      })
  );
}

async function processInsightsFailed(dryRun = false) {
  let files;
  try {
    files = await fs.readdir(INSIGHTS_FAILED_DIR);
  } catch (err) {
    log.error(`Error reading ${INSIGHTS_FAILED_DIR}:`, err.message);
    return;
  }

  if (files.length === 0) return;

  const dynamicSections = await getDynamicSections();

  await Promise.all(
    files
      .filter((f) => f !== '.gitkeep')
      .map(async (name) => {
        const filePath = path.join(INSIGHTS_FAILED_DIR, name);
        try {
          const result = await classifyFile(filePath);
          let targetDir = path.join(CONTENT_DIR, result.section);
          let tags = result.tags || [];
          let extra = { status: 'draft' };
          if (!dynamicSections.includes(result.section)) {
            targetDir = UNTAGGED_DIR;
          } else if (result.confidence < 0.8) {
            targetDir = REVIEW_NEEDED_DIR;
            extra = {
              status: 'draft',
              confidence: result.confidence,
              reasoning: result.reasoning,
            };
          }
          const dest = await moveFile(filePath, targetDir, tags, dryRun, extra);
          log.info(`Moved ${name} -> ${dest}`);
          await processMarkdownFile(dest, dryRun);
        } catch (err) {
          log.error(`Retry insight failed for ${filePath}:`, err.message);
        }
      })
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const dryIndex = argv.indexOf('--dry-run');
  const dryRun = dryIndex !== -1;
  if (dryRun) argv.splice(dryIndex, 1);

  if (!process.env.OPENAI_API_KEY) {
    log.error('OPENAI_API_KEY not set; skipping retries');
    return;
  }

  await processInboxFailed(dryRun);
  await processInsightsFailed(dryRun);
}

export { main, processInboxFailed, processInsightsFailed };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('retry-failed main error:', err);
    process.exit(1);
  });
}
