import { log } from './logger.mjs';
import { retryFetch } from './retryFetch.mjs';

// Model name can be overridden via the OPENAI_MODEL env var
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-1106';

/**
 * Send a prompt to the OpenAI Chat API and return the assistant reply.
 * @param {string} prompt Text to send to the model.
 * @returns {Promise<string>} The assistant's response.
 * @throws {Error} If `OPENAI_API_KEY` is not set.
 */
export async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  log.debug(
    `Calling OpenAI model ${MODEL} with prompt length ${prompt.length}`
  );
  const res = await retryFetch('https://api.openai.com/v1/chat/completions', {
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
  const data = await res.json();
  log.debug('OpenAI response received');
  return data.choices[0].message.content.trim();
}
