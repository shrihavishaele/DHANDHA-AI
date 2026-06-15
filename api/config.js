const dotenv = require('dotenv');

dotenv.config();

module.exports = (req, res) => {
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    hasGroqConfig: Boolean(groqKey)
  });
};
