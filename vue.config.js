const { defineConfig } = require('@vue/cli-service')

module.exports = {
  devServer: {
    proxy: {
      // Только /api/* -> 8000
      '^/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // pathRewrite: { '^/api': '' } убирате /api из url-path
      }
    }
  }
}