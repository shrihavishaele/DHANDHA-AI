const dotenv = require('dotenv');

dotenv.config();

module.exports = (req, res) => {
  const nvidiaKey = (process.env.NVIDIA_API_KEY || '').trim();
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    hasNvidiaConfig: Boolean(nvidiaKey)
  });
};
