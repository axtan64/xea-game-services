const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
    root: __dirname,
    plugins: [react()],
    server: {
        proxy: {
            '/auth': 'http://localhost:3006',
            '/api': 'http://localhost:3006',
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
