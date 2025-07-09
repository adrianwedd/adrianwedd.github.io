import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-1106';
const SECTIONS = ['tools', 'logs', 'garden', 'mirror', 'resume', 'agents'];

function buildPrompt(content) {
  return `You are an AI assistant helping organise a Personal Intelligence Node.\n` +
    `Classify the following text into one of these sections: ${SECTIONS.join(', ')}.\n` +
    `Return JSON with keys section, tags (array), and confidence (0-1).\n` +
    `Text:\n${content}`;
}

async function callOpenAI(prompt) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function classifyFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const reply = await callOpenAI(buildPrompt(content));
  try {
    return JSON.parse(reply);
  } catch (err) {
    console.error(`Invalid JSON from OpenAI for ${path.basename(filePath)}:`, err);
    return null;
  }
}

function isValidResult(result) {
  return result &&
    typeof result.section === 'string' &&
    Array.isArray(result.tags) &&
    typeof result.confidence === 'number' &&
    SECTIONS.includes(result.section) &&
    result.confidence >= 0 && result.confidence <= 1;
}

async function moveFile(src, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(src));
  await fs.rename(src, dest);
  return dest;
}

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set; skipping classification');
    return;
  }
  const inboxDir = path.join('content', 'inbox');
  const files = (await fs.readdir(inboxDir)).filter(f => f !== '.gitkeep');
  if (files.length === 0) {
    console.log('No inbox files to process.');
    return;
  }
  for (const name of files) {
    const filePath = path.join(inboxDir, name);
    let result;
    try {
      result = await classifyFile(filePath);
    } catch (err) {
      console.error(`Failed to classify ${name}:`, err);
    }

    let targetDir = path.join('content', 'untagged');
    if (!isValidResult(result)) {
      console.error(`Validation failed for ${name}:`, result);
      targetDir = path.join('content', 'inbox', 'failed');
    } else if (result.confidence >= 0.8) {
      targetDir = path.join('content', result.section);
      if (result.tags && result.tags.length) {
        const data = await fs.readFile(filePath, 'utf8');
        const fm = `---\ntags: [${result.tags.join(', ')}]\n---\n`;
        await fs.writeFile(filePath, fm + data);
      }
    }

    const dest = await moveFile(filePath, targetDir);
    console.log(`Moved ${name} to ${dest}`);
  }
}

export { buildPrompt, callOpenAI, classifyFile, moveFile, main };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
