// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    rules: {
      // UI primitives intentionally export both a named and a default symbol
      // (e.g. `export function Screen` + `export default Screen`).
      'import/no-named-as-default': 'off',
    },
  },
]);
