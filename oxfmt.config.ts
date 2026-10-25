import { defineConfig } from 'oxfmt'

export default defineConfig({
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    printWidth: 150,
    trailingComma: 'none',
    arrowParens: 'avoid',
    ignorePatterns: ['CHANGELOG.md', 'dist']
})
