export const healthCheck = (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
};
