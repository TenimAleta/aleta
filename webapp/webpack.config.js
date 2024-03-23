const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      https: require.resolve('https-browserify'),
      http: require.resolve('stream-http'),
      timers: require.resolve('timers-browserify'),
      os: require.resolve('os-browserify/browser'),
      domain: require.resolve('domain-browser')
    }
  }
};