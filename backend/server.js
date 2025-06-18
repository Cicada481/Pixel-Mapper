require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const multer = require('multer')
const fs = require('fs').promises // async version
const path = require('path')
const { Jimp } = require('jimp')
const { intToRGBA } = require('@jimp/utils')
const { google } = require('googleapis')

const app = express()

const PORT = process.env.PORT || 3001
const UPLOADS_DIR_PATH = path.join(__dirname, 'image_uploads')
const REDIRECT_URI = `http://localhost:${PORT}/auth/google/callback`;

// Creates upload directory path if it does not exist
(async () => {
    try {
        await fs.mkdir(UPLOADS_DIR_PATH, {recursive: true})
        console.log(`Directory ${UPLOADS_DIR_PATH} created`)
    } catch (error) {
        if (error.code === 'EEXIST') {
            console.log('Directory already exists')
        } else {
            console.error("Could not ensure directory path", error.stack)
            process.exit(1)
        }
    }
})()

// called after verify function
passport.serializeUser((user, done) => {
    done(null, user)
})

// called in passport.session middleware
passport.deserializeUser((user, done) => {
    done(null, user)
})

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: REDIRECT_URI
}, (accessToken, refreshToken, profile, done) => { // verify function
    profile.accessToken = accessToken
    done(null, profile)
}))

const imageStorage = multer.diskStorage({
    destination: (req, file, done) => {
        done(null, UPLOADS_DIR_PATH)
    },
    filename: (req, file, done) => {
        done(null, Date.now() + '-' + file.originalname)
    }
})

const formUpload = multer({storage: imageStorage})

// MIDDLEWARE STACK

app.use(cors())
app.use(express.json())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())

app.use(passport.session()) // uses session ID in cookie to populate req.user

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'https://www.googleapis.com/auth/spreadsheets']
    // allows redirection to the properly formed Google's sign-in page
}))

app.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: 'http://localhost:5173',
    failureRedirect: 'http://localhost:5173/login-error'
    // involves token exchanges after the user grants permission
}))

app.get('/api/current_user', (req, res) => {
    if (req.user) {
        console.log('req.user: ', req.user)
        console.log('User Access token from session: ', req.user.accessToken)
        res.json(req.user)
    } else {
        res.status(401).json({message: 'Not authorized'})
    }
})

app.get('/', (req, res) => {
    res.send('API for Pixel Mapper Backend')
})

app.get('/api/status', (req, res) => {
    res.send('Status: OK')
})

// Content-Type multipart/form-data to be parsed by Multer instance
app.post('/process-sheet', formUpload.single('uploadedImage'), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({message: 'not logged in'})
        }

        // Parse spreadsheet for ID
        if (!req.body.sheetUrl) {
            return res.status(400).json({message: 'sheetUrl property missing'})
        }

        let sheetUrl = req.body.sheetUrl
        let sheetIDStart = sheetUrl.indexOf('/d/') + '/d/'.length
        let sheetIDEnd = sheetUrl.indexOf('/edit')
        if (sheetIDStart === -1 || sheetIDEnd === -1) {
            return res.status(400).json({message: 'Invalid spreadsheet link'})
        }
        let sheetID = sheetUrl.substring(sheetIDStart, sheetIDEnd)

        // Image processing
        const image = await Jimp.read(req.file.path) // asynchronous operation

        const TARGET_SHEET_COLUMNS = 20
        image.resize({w: TARGET_SHEET_COLUMNS}) // Resize image
        console.log('new image dimensions', image.width, image.height)
        
        const colorGrid = [] // Extract colors to 2D array
        for (let i = 0; i < image.height; i++) {
            colorGrid[i] = []
            for (let j = 0; j < image.width; j++) {
                colorGrid[i][j] = intToRGBA(image.getPixelColor(j, i))
            }
        }
        console.log(colorGrid[0]) // first row of color grid

        // Set up an OAuth2 client instance to communicate with Sheets API
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )
        oauth2Client.setCredentials({access_token: req.user.accessToken})
        const sheets = google.sheets({version: 'v4', auth: oauth2Client})

        console.log('sheets', sheets)
        // TBD

        // Send back parsed ID
        res.json({parsedId: sheetID, fileName: req.file.originalname})
    } catch (error) {
        console.error(error.stack)
        res.status(500).json({message: "An unexpected error occured"})
    }
})

app.listen(PORT, () => {
    console.log(`Backend server is up and running on port ${PORT}`)
})