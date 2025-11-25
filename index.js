require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const { OpenAI } = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY in environment. See .env');
  process.exit(1);
}
const client = new OpenAI({ apiKey });

async function promptQuestion(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function readMultilineUntilEnd() {
  console.log("Paste your text. Enter a single line with END to finish input:");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let lines = [];
  for await (const line of rl) {
    if (line.trim() === 'END') {
      rl.close();
      break;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

async function main() {
  const choice = await promptQuestion('Choose input method: (1) Paste text (type END on its own line to finish) (2) Read from file\nEnter 1 or 2: ');
  let text = '';
  if (choice.trim() === '1') {
    text = await readMultilineUntilEnd();
  } else if (choice.trim() === '2') {
    const filePath = await promptQuestion('Enter file path: ');
    try { text = fs.readFileSync(filePath.trim(), 'utf8'); } catch (e) { console.error('Failed to read file:', e.message); process.exit(1); }
  } else {
    console.error('Invalid choice'); process.exit(1);
  }
  if (!text.trim()) { console.error('No text provided'); process.exit(1); }

  console.log('\nGenerating 3-sentence summary...');

  const systemPrompt = 'You are a helpful assistant that summarizes text into exactly three concise sentences.';
  const userPrompt = `Summarize the following text into exactly 3 sentences. Keep it concise and preserve the main points. Output only the summary (no commentary).\n\nText:\n${text}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const summary = response.choices?.[0]?.message?.content?.trim() ?? '';
    const originalLength = text.length;
    const summaryLength = summary.length;

    console.log('\nOriginal length (characters):', originalLength);
    console.log('Summary length (characters):', summaryLength);
    console.log('\nSummary:\n');
    console.log(summary);

    if (response.usage) {
      console.log('\nToken usage:');
      console.log('  prompt_tokens:', response.usage.prompt_tokens);
      console.log('  completion_tokens:', response.usage.completion_tokens);
      console.log('  total_tokens:', response.usage.total_tokens);
    } else {
      console.log('\nToken usage not returned by API.');
    }
  } catch (err) {
    console.error('OpenAI request failed:', err.message || err);
    process.exit(1);
  }
}

main();

