import { log } from './logger.mjs';

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-1106';

export async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  log.debug(
    `Calling OpenAI model ${MODEL} with prompt length ${prompt.length}`
  );
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
    log.error(`OpenAI API error ${res.status}: ${errorBody}`);
    throw new Error(`OpenAI API error ${res.status}: ${errorBody}`);
  }
  const data = await res.json();
  log.debug('OpenAI response received');
  return data.choices[0].message.content.trim();
}
