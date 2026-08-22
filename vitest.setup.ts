import '@testing-library/jest-dom/vitest'

// Alle Tests laufen in der Zeitzone der App – sonst wandern Datumsgrenzen.
process.env.TZ = 'Europe/Vienna'
