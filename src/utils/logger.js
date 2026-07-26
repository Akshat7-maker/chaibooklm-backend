export const log = (...args) => {
  if (Bun.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};
