require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { Jimp } = require('jimp')
const { intToRGBA } = require('@jimp/utils')
const { google } = require('googleapis')

const app = express()

const PORT = process.env.PORT || 3001
const UPLOADS_DIR_PATH = path.join(__dirname, 'image_uploads')
const REDIRECT_URI = `http://localhost:${PORT}/auth/google/callback`;

// Create image uploads directory path
try {
    const dirPath = fs.mkdirSync(UPLOADS_DIR_PATH, {recursive: true})
    if (dirPath) {
        console.log(`Directory ${dirPath} created`)
    } else {
        console.log(`Directory ${UPLOADS_DIR_PATH} already exists`)
    }
} catch (error) {
    console.error(error.stack)
    process.exit(1)
}

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
        // TBD add later
        // if (!req.user) {
        //     return res.status(401).json({message: 'not logged in'})
        // }

        // Parse spreadsheet for ID
        if (!req.body.sheetUrl) {
            return res.status(400).json({message: 'sheetUrl property missing'})
        }

        let sheetUrl = req.body.sheetUrl
        let spreadsheetIDStart = sheetUrl.indexOf('/d/') + '/d/'.length
        let spreadsheetIDEnd = sheetUrl.indexOf('/edit')
        if (spreadsheetIDStart === -1 || spreadsheetIDEnd === -1) {
            return res.status(400).json({message: 'Invalid spreadsheet link'})
        }
        let spreadsheetId = sheetUrl.substring(spreadsheetIDStart, spreadsheetIDEnd)

        // Image processing
        const image = await Jimp.read(req.file.path) // asynchronous operation

        const TARGET_SHEET_COLUMNS = 150
        image.resize({w: TARGET_SHEET_COLUMNS}) // Bilinear interpolation
        
        const colorGrid = [] // Extract colors to 2D array
        for (let i = 0; i < image.height; i++) {
            colorGrid[i] = []
            for (let j = 0; j < image.width; j++) {
                colorGrid[i][j] = intToRGBA(image.getPixelColor(j, i))
            }
        }

        // Set up an OAuth2 client instance to communicate with Sheets API
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )
        // TBD Fix hardcoding of access token
        oauth2Client.setCredentials({access_token: process.env.TEST_ACCESS_TOKEN || req.user.accessToken})
        const sheets = google.sheets({version: 'v4', auth: oauth2Client})

        const sheetId = 0 // TBD change later
        
        // Create an array of RowData objects and fill it
        // Needed for creation of UpdateCellsRequest
        const rows = []
        for (let i = 0; i < colorGrid.length; i++) {
            const rowValues = []
            for (let j = 0; j < colorGrid[0].length; j++) {
                // Set color of spreadsheet cell
                const currentColor = colorGrid[i][j]
                const cellData = {
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: {
                                red: currentColor.r / 255,
                                green: currentColor.g / 255,
                                blue: currentColor.b / 255
                            }
                        }
                    }
                } // a CellData object
                rowValues.push(cellData)
            }
            rows.push({values: rowValues}) // Append this row of cell values
        }

        const updateCells = { // An UpdateCellsRequest object
            rows,
            fields: 'userEnteredFormat/backgroundColorStyle',
            start: {
                sheetId,
                rowIndex: 0,
                columnIndex: 0
            }
        }
        // Sheets API call
        // TBD add error checking (e.g. if API call fails)
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{updateCells}]
            }
        })
        console.log("After Sheets API call")

        // Send back parsed ID
        res.json({parsedId: spreadsheetId, fileName: req.file.originalname})
    } catch (error) {
        console.error(error.stack)
        res.status(500).json({message: "An unexpected error occured"})
    }
})

app.listen(PORT, () => {
    console.log(`Backend server is up and running on port ${PORT}`)
})

