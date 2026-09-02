// Jest resolver: React Native's resolver, plus react-native-worklets' rule that swaps its
// `.native` modules for the JS fallbacks (the native module does not exist under Jest).
// Mirrors node_modules/react-native-worklets/jest/resolver.js without dropping the RN preset resolver.
const rnResolver = require(require('jest-expo/jest-preset').resolver);

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    };
  }
  return rnResolver(request, options);
};
