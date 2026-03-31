const dotenv = require('dotenv');

dotenv.config();

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    hasNvidiaConfig: Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_URL)
  });
};
