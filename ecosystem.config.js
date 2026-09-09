module.exports = {
  apps: [
    {
      name: 'pyxie',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '180M',
      node_args: '--max-old-space-size=160',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
