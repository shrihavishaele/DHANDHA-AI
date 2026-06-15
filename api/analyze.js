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

    const nvidiaKey = (body.apiKey || process.env.NVIDIA_API_KEY || '').trim();
    const nvidiaUrl = (body.apiUrl || process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1').trim();
    const nvidiaModel = body.model || process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

    if (!nvidiaKey) {
      return res.status(400).json({ error: 'NVIDIA API key is required. Provide it in the form or set NVIDIA_API_KEY.' });
    }

    const client = new OpenAI({ apiKey: nvidiaKey, baseURL: nvidiaUrl });
    const datasetContext = buildDatasetContext(body);
    const completion = await Promise.race([
      client.chat.completions.create({
        model: nvidiaModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${USER_PROMPT(body)}\n\nDATASET CONTEXT:\n${datasetContext}` }
        ],
        temperature: 0.5,
        top_p: 0.9,
        max_tokens: 1200,
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
