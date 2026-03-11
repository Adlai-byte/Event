// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimize bundler performance for faster loading
config.transformer = {
  ...config.transformer,
  // Enable inline requires for faster startup
  inlineRequires: true,
  // Optimize minification
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      module: true,
    },
  },
};

// Optimize resolver
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'],
  // Enable unstable_allowRequireContext for better tree shaking
  unstable_enablePackageExports: true,
};

// Optimize server settings
config.server = {
  ...config.server,
  // Reduce timeout for faster error reporting
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

module.exports = config;

