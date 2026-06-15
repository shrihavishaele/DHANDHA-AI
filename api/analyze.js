const OpenAI = require('openai');
const dotenv = require('dotenv');
const { SYSTEM_PROMPT, USER_PROMPT, buildDatasetContext } = require('../lib/analysis-helper');

dotenv.config();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const idea = body.idea;
    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: 'Idea is required.' });
    }

    const groqKey = (body.apiKey || process.env.GROQ_API_KEY || '').trim();
    const groqModel = (body.model || process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim();

    if (!groqKey) {
      return res.status(400).json({ error: 'Groq API key is required. Set GROQ_API_KEY in .env.' });
    }

    const client = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
    const datasetContext = buildDatasetContext(body);
    const completion = await Promise.race([
      client.chat.completions.create({
        model: groqModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${USER_PROMPT(body)}\n\nDATASET CONTEXT:\n${datasetContext}` }
        ],
        temperature: 0.5,
        top_p: 0.9,
        max_completion_tokens: 1200,
        stream: false
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Model timed out. Try again or use a faster model in .env.')), 90000))
    ]);

    const responseText = completion.choices?.[0]?.message?.content || '';

    return res.status(200).json({ result: responseText || 'No response from the model.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected error.' });
  }
};
