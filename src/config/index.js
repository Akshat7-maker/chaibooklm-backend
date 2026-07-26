const port = Number(Bun.env.PORT ?? 4000);
const nodeEnv = Bun.env.NODE_ENV ?? 'development';

export const config = {
  port,
  nodeEnv,
};
