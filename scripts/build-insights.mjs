import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { callOpenAI } from './classify-inbox.mjs'; // Reusing callOpenAI

const TARGET_DIRS = [
  path.join('content', 'garden'),
  path.join('content', 'logs'),
  path.join('content', 'mirror'),
];

function buildSummaryPrompt(content) {
  return `Summarize the following text concisely, highlighting key insights and cross-references. Format the output as markdown.\nText:\n${content}`;
}

async function processMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  try {
    const summary = await callOpenAI(buildSummaryPrompt(content));
    const insightFileName = fileName.replace(/\.md$/, '.insight.md');
    const insightFilePath = path.join(dirName, insightFileName);
    await fs.writeFile(insightFilePath, summary);
    console.log(`Generated insight for ${fileName} -> ${insightFileName}`);
  } catch (err) {
    console.error(`Failed to generate insight for ${fileName}:`, err.message);
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set; skipping insight generation');
    return;
  }

  for (const dir of TARGET_DIRS) {
    try {
      const files = await fs.readdir(dir);
      const markdownFiles = files.filter(file => file.endsWith('.md') && !file.endsWith('.insight.md'));

      for (const file of markdownFiles) {
        await processMarkdownFile(path.join(dir, file));
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`Directory not found: ${dir}. Skipping.`);
      } else {
        console.error(`Error processing directory ${dir}:`, err.message);
      }
    }
  }
  console.log('Insight generation complete.');
}

export { main, buildSummaryPrompt, processMarkdownFile };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}