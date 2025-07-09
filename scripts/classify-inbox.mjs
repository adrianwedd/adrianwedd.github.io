import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } = 'url';

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-1106';
// REMOVE: const SECTIONS = ['tools', 'logs', 'garden', 'mirror', 'resume', 'agents'];

// Function to dynamically discover content sections
async function getDynamicSections() {
  const contentDir = path.join('content');
  const entries = await fs.readdir(contentDir, { withFileTypes: true });
  const sections = entries
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !['inbox', 'untagged', 'agents', 'codex', 'tools', 'logs', 'garden', 'mirror', 'resume'].includes(name)); // Filter out non-content directories
  return sections;
}

async function buildPrompt(content) {
  const dynamicSections = await getDynamicSections(); // Get dynamic sections
  return `You are an AI assistant helping organise a Personal Intelligence Node.\n` +
    `Classify the following text into one of these sections: ${dynamicSections.join(', ')}.\n` +
    `Return JSON with keys section, tags (array), and confidence (0-1).\n` +
    `Text:\n${content}`;
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errorBody}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function classifyFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const reply = await callOpenAI(buildPrompt(content));
  let result;
  try {
    result = JSON.parse(reply);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${reply}`);
  }

  const { section, tags, confidence } = result;
  if (!section || !tags || confidence === undefined) {
    throw new Error(`Malformed response, missing keys: ${JSON.stringify(result)}`);
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
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(src));
  await fs.rename(src, dest);
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
    const changedFiles = changedFilesString.split(',').map(f => f.trim()).filter(f => f.length > 0);

    // Filter for files that are actually in the inbox directory
    const allInboxFiles = (await fs.readdir(inboxDir)).filter(f => f !== '.gitkeep' && f !== 'failed');
    filesToProcess = changedFiles.filter(f => allInboxFiles.includes(path.basename(f)) && path.dirname(f) === inboxDir);

    if (filesToProcess.length === 0) {
      console.log('No relevant changed inbox files to process.');
      return;
    }
  } else {
    // No arguments, process all files in inbox
    filesToProcess = (await fs.readdir(inboxDir)).filter(f => f !== '.gitkeep' && f !== 'failed');
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
      if (dynamicSections.includes(result.section) && result.confidence >= 0.8) {
        targetDir = path.join('content', result.section);
        if (result.tags && result.tags.length) {
          const data = await fs.readFile(filePath, 'utf8');
          const fm = `---\ntags: [${result.tags.join(', ')}]\n---\n`;
          await fs.writeFile(filePath, fm + data);
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

export { buildPrompt, callOpenAI, classifyFile, moveFile, main, getDynamicSections };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
