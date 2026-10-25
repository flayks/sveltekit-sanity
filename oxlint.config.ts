import { defineConfig } from 'oxlint'

export default defineConfig({
    plugins: ['typescript', 'unicorn', 'import'],
    categories: {
        correctness: 'error',
        suspicious: 'warn'
    },
    ignorePatterns: ['dist']
})
