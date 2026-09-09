module.exports = {
  apps: [
    {
      name: 'kuromi',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      node_args: '--max-old-space-size=192',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
