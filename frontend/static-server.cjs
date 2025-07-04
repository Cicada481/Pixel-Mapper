// Simple express server that serves the frontend's static files

require('dotenv').config({ path: '.env.production' })

const express = require('express')
const path = require('path')

const app = express()

const PORT = process.env.PORT || 3000

console.log('env1', process.env.VITE_FRONTEND_URL, process.env.VITE_BACKEND_URL)

// Serve any relevant files found in the dist directory 
app.use(express.static(path.join(__dirname, 'dist')))

// Fallback route
app.get(/.*/, (req, res) => {
    // Serve the main page (SPA) as fallback
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
    console.log(`Web server is up and running on port ${PORT}`)
})