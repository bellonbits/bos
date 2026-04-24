module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-reanimated
      'react-native-reanimated/plugin',
      // Path aliases (matches tsconfig paths)
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@db': './src/db',
            '@sync': './src/sync',
            '@stores': './src/stores',
            '@components': './src/components',
            '@services': './src/services',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@hooks': './src/hooks',
          },
        },
      ],
    ],
  };
};
