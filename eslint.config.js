import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import importX from 'eslint-plugin-import-x'
import reactX from 'eslint-plugin-react-x'
import reactCompiler from 'eslint-plugin-react-compiler'
import reactDom from 'eslint-plugin-react-dom'
import tailwindcss from 'eslint-plugin-tailwindcss'
import jsxA11y from 'eslint-plugin-jsx-a11y'

import {defineConfig, globalIgnores} from 'eslint/config'

export default defineConfig([
    globalIgnores(['dist']),
    {

        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
            reactX.configs['recommended-typescript'],
            reactCompiler.configs.recommended,
            reactDom.configs.recommended,
            importX.flatConfigs.recommended,
            importX.flatConfigs.typescript,
            jsxA11y.flatConfigs.recommended,
            ...tailwindcss.configs['flat/recommended'],
        ],
        plugins: {
            'import-x': importX,
        },
        languageOptions: {
            globals: globals.browser,
            parserOptions: {
                project: ['./tsconfig.node.json', './tsconfig.app.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {

            'import-x/resolver': {
                typescript: {
                    alwaysTryTypes: true, // 항상 @types 패키지 먼저 조율
                    project: ['./tsconfig.node.json', './tsconfig.app.json'],
                },
            },
        },
        rules: {
            'react-x/no/class-component': 'warn',
            'react-dom/no-dangerously-set-innerhtml': 'warn',
            'import-x/no-dynamic-require': 'warn',
        },
    },
    eslintConfigPrettier,
])
