export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Not Found' });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack ?? err);
  res.status(500).json({ error: 'Internal Server Error' });
};
