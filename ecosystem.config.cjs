module.exports = {
  apps: [
    {
      name: 'libt-zero-cache',
      script: 'npx',
      args: 'zero-cache-dev',
      cwd: __dirname,
      env: {
        ZERO_UPSTREAM_DB: 'postgresql://postgres:postgres@localhost:5432/libt',
        ZERO_QUERY_URL: 'http://localhost:3000/api/zero/query',
        ZERO_MUTATE_URL: 'http://localhost:3000/api/zero/mutate',
        ZERO_QUERY_FORWARD_COOKIES: 'true',
        ZERO_MUTATE_FORWARD_COOKIES: 'true',
        ZERO_PORT: '4849',
      },
    },
  ],
}
