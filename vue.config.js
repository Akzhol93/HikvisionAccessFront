const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack');

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
  },
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      })
    ]
  }
}