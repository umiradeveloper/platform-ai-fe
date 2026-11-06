// PM2 — Umira AI frontend.   npm run build && npm start
module.exports = {
  apps: [
    {
      name: 'umira-web',
      cwd: __dirname,
      script: '.next/standalone/server.js',
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        HOSTNAME: process.env.WEB_HOST || '0.0.0.0',
      },
      time: true,
    },
  ],
};
