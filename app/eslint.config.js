import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Generated shadcn primitives and the i18n provider export helpers next to
    // components by design; Fast Refresh falls back to a full reload there.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/i18n/I18nContext.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // shadcn sidebar skeleton picks a random width once per mount (useMemo).
    files: ['src/components/ui/sidebar.tsx'],
    rules: { 'react-hooks/purity': 'off' },
  },
])
