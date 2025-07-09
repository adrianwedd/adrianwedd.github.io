import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { callOpenAI } from './utils/llm-api.mjs';

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
    console.error(
      `Error reading content directory ${contentDir}:`,
      err.message
    );
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
    console.error(
      `Error reading file ${filePath} for classification:`,
      err.message
    );
    throw err; // Re-throw to be caught by main's try-catch
  }

  const reply = await callOpenAI(await buildPrompt(content));
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

async function moveFile(src, destDir) {
  try {
    await fs.mkdir(destDir, { recursive: true });
  } catch (err) {
    console.error(
      `Error creating destination directory ${destDir}:`,
      err.message
    );
    throw err;
  }
  const dest = path.join(destDir, path.basename(src));
  try {
    await fs.rename(src, dest);
  } catch (err) {
    console.error(`Error moving file from ${src} to ${dest}:`, err.message);
    throw err;
  }
  return dest;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set; skipping classification');
    return;
  }

  const inboxDir = path.join('content', 'inbox');
  const failedDir = path.join(inboxDir, 'failed');

  const dynamicSections = await getDynamicSections(); // Get dynamic sections for validation

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
      console.error(`Error reading inbox directory ${inboxDir}:`, err.message);
      return; // Cannot proceed without reading inbox
    }

    filesToProcess = changedFiles.filter(
      (f) =>
        allInboxFiles.includes(path.basename(f)) && path.dirname(f) === inboxDir
    );

    if (filesToProcess.length === 0) {
      console.log('No relevant changed inbox files to process.');
      return;
    }
  } else {
    // No arguments, process all files in inbox
    try {
      filesToProcess = (await fs.readdir(inboxDir)).filter(
        (f) => f !== '.gitkeep' && f !== 'failed'
      );
    } catch (err) {
      console.error(`Error reading inbox directory ${inboxDir}:`, err.message);
      return; // Cannot proceed without reading inbox
    }

    if (filesToProcess.length === 0) {
      console.log('No inbox files to process.');
      return;
    }
  }

  for (const name of filesToProcess) {
    const filePath = path.join(inboxDir, name);
    let targetDir;

    try {
      const result = await classifyFile(filePath);
      // Use dynamicSections for validation
      if (
        dynamicSections.includes(result.section) &&
        result.confidence >= 0.8
      ) {
        targetDir = path.join('content', result.section);
        if (result.tags && result.tags.length) {
          let data;
          try {
            data = await fs.readFile(filePath, 'utf8');
          } catch (err) {
            console.error(
              `Error reading file ${filePath} to add tags:`,
              err.message
            );
            targetDir = failedDir; // Move to failed if cannot read to add tags
          }
          if (targetDir !== failedDir) {
            // Only write if not already marked for failed
            const fm = `---\ntags: [${result.tags.join(', ')}]\n---\n`;
            try {
              await fs.writeFile(filePath, fm + data);
            } catch (err) {
              console.error(
                `Error writing tags to file ${filePath}:`,
                err.message
              );
              targetDir = failedDir; // Move to failed if cannot write tags
            }
          }
        }
      } else {
        targetDir = path.join('content', 'untagged');
      }
    } catch (err) {
      console.error(`Failed to classify ${name}:`, err.message);
      targetDir = failedDir;
    }

    const dest = await moveFile(filePath, targetDir);
    console.log(`Moved ${name} to ${dest}`);
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
    console.error(err);
    process.exit(1);
  });
}
