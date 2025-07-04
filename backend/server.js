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
const REDIRECT_URI = `${process.env.BACKEND_URL}/auth/google/callback`;

// Create image uploads directory path
try {
    const dirPath = fs.mkdirSync(UPLOADS_DIR_PATH, {recursive: true})
    if (dirPath) {
        console.log(`Directory ${dirPath} created`)
    }
} catch (error) {
    console.error(error)
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

app.use(cors({
    origin: process.env.FRONTEND_URL, // any origin by default
    credentials: true
}))
app.use(express.json())
app.use(session({ // extracts session ID from incoming cookie
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        sameSite: 'None', // required for cross-site cookie sending
        secure: process.env.NODE_ENV === 'production' // must be true if SameSite=None
    }
}))
app.use(passport.initialize())
app.use(passport.session()) // uses session ID to populate req.user

// ROUTES

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'https://www.googleapis.com/auth/spreadsheets']
    // allows redirection to the properly formed Google's sign-in page
}))

app.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: process.env.FRONTEND_URL,
    failureRedirect: `${process.env.FRONTEND_URL}/login-error`
    // involves token exchanges after the user grants permission
}))

app.get('/api/current_user', (req, res) => {
    if (req.user) {
        console.log('req.user: ', req.user)
        console.log('User Access token from session: ', req.user.accessToken)
        return res.json(req.user)
    } else {
        console.log('No user found')
        return res.status(401).json({message: 'Not authorized'})
    }
})

app.post('/auth/logout', (req, res) => {
    try {
        // Callback-based synchronous functions that perform async operations
        req.logout(err => {
            if (err) {
                console.error(err)
                return res.status(500).json({message: 'Error during Passport logout'})
            }

            // No error during logout
            req.session.destroy(err => {
                if (err) {
                    console.error(err)
                    return res.status(500).json({message: 'Error destroying session'})
                }

                return res.json({message: 'Logged out successfully'})
            })
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: 'Error in logout handler'})
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
        // No valid session found for user
        if (!req.user) {
            return res.status(401).json({message: 'not logged in'})
        }

        // Image details are contained in req.file

        // Validate form fields
        const formTextFields = ['sheetUrl', 'numColumns', 'cellWidth', 'cellHeight']
        if (!req.file || formTextFields.some(fieldName => !Object.hasOwn(req.body, fieldName))) {
            // At least one required form field is missing
            return res.status(400).json({message: 'Missing form fields'})
        }

        // Parse data entered by the user via form
        const sheetUrl = req.body.sheetUrl
        let numColumns = parseInt(req.body.numColumns)
        const cellWidth = parseInt(req.body.cellWidth) // NaN if not an int
        const cellHeight = parseInt(req.body.cellHeight) // NaN if not an int
        console.log('Spreadsheet URL', sheetUrl)
        console.log('Form dimensions data', numColumns, cellWidth, cellHeight)

        // Validation on the number of columns
        if (!(numColumns > 0)) {
            return res.status(400).json({
                message: 'Number of columns must be positive',
                code: 'NON_POSITIVE_COLUMNS'
            })
        }
        if (numColumns > 300) {
            numColumns = 300
        }

        // Parse URL for spreadsheet ID
        const spreadsheetIdStart = sheetUrl.indexOf('/d/') + '/d/'.length
        const spreadsheetIdEnd = sheetUrl.indexOf('/edit')
        if (spreadsheetIdStart === -1 || spreadsheetIdEnd === -1) {
            return res.status(400).json({message: 'Invalid spreadsheet link'})
        }
        const spreadsheetId = sheetUrl.substring(spreadsheetIdStart, spreadsheetIdEnd)

        // Parse URL for sheet ID
        const sheetIdStart = sheetUrl.indexOf('?gid=') + '?gid='.length
        const sheetIdEnd = sheetUrl.indexOf('#gid=')
        if (sheetIdStart === -1 || sheetIdEnd === -1) {
            return res.status(400).json({message: 'Invalid sheet link'})
        }
        const sheetId = sheetUrl.substring(sheetIdStart, sheetIdEnd)
        
        // Read image from path and resize image
        const image = await Jimp.read(req.file.path)
        fs.promises.unlink(req.file.path) // Delete the temporarily uploaded file
        image.resize({w: numColumns}) // Bilinear interpolation

        // Extract the colors from image into a 2D array
        const colorGrid = []
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
        oauth2Client.setCredentials({access_token: req.user.accessToken})
        const sheets = google.sheets({version: 'v4', auth: oauth2Client})

        // Find the current dimensions (number of rows and cols) of the sheet
        const targetSpreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId
        })
        const targetSheet = targetSpreadsheetResponse.data.sheets.find(sheetItem => {
            return sheetItem.properties.sheetId === parseInt(sheetId)
        })
        if (!targetSheet) {
            return res.status(400).json({message: 'Invalid sheet ID'})
        }
        const targetSheetGridProperties = targetSheet.properties.gridProperties
        const oldRowCount = targetSheetGridProperties.rowCount
        const oldColumnCount = targetSheetGridProperties.columnCount

        // Prepare a list of requests for the batchUpdate
        const requests = []
        
        // Check if more columns need to be added
        if (oldColumnCount < image.width) {
            const appendColumns = { // AppendDimensionRequest object
                sheetId,
                dimension: 'COLUMNS',
                length: image.width - oldColumnCount
            }
            requests.push({appendDimension: appendColumns})
        }

        // Check if more rows need to be added
        if (oldRowCount < image.height) {
            const appendRows = { // AppendDimensionRequest object
                sheetId,
                dimension: 'ROWS',
                length: image.height - oldRowCount
            }
            requests.push({appendDimension: appendRows})
        }

        // Modify the width of spreadsheet cells if the user asked
        if (cellWidth) {
            const updateCellWidths = { // UpdateDimensionPropertiesRequest object
                properties: {
                    pixelSize: cellWidth - 1
                },
                fields: 'pixelSize',
                range: {
                    sheetId,
                    dimension: 'COLUMNS',
                    startIndex: 0,
                    endIndex: image.width
                },
            }
            requests.push({updateDimensionProperties: updateCellWidths})
        }

        // Modify the height of spreadsheet cells if the user asked
        if (cellHeight) {
            const updateCellHeights = { // UpdateDimensionPropertiesRequest object
                properties: {
                    pixelSize: cellHeight
                },
                fields: 'pixelSize',
                range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: 0,
                    endIndex: image.height
                },
            }
            requests.push({updateDimensionProperties: updateCellHeights})
        }
        
        // Create an array of RowData objects
        // Needed for creation of an UpdateCellsRequest
        const rows = colorGrid.map(colorRow => {
            const rowDataValues = colorRow.map(color => {
                return { // a CellData object
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: {
                                red: color.r / 255,
                                green: color.g / 255,
                                blue: color.b / 255
                            }
                        }
                    }
                }
            })
            return { // a RowData object
                values: rowDataValues
            }
        })

        // Fill cells with colors
        const colorCells = { // An UpdateCellsRequest object
            rows,
            fields: 'userEnteredFormat/backgroundColorStyle',
            start: {
                sheetId,
                rowIndex: 0,
                columnIndex: 0
            }
        }
        requests.push({updateCells: colorCells})
        
        // Make an external API call to update the spreadsheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests
            }
        })
        console.log("Successful sheet update via Sheets API call")

        // Send success response
        return res.json({
            spreadsheetId,
            sheetId,
            fileName: req.file.originalname
        })
    } catch (error) {
        console.error(error)
        if (error.code) { // error comes from an external API call, e.g. Sheets API
            if (error.code == 400) {
                return res.status(500).json({message: 'Internal server error: invalid request to Sheets API'})
            } else if (error.code === 401) {
                return res.status(401).json({message: 'Access token is expired or invalid'})
            } else if (error.code === 403) {
                return res.status(403).json({message: 'No edit access to sheet'})
            } else if (error.code === 404) {
                return res.status(400).json({message: 'Invalid spreadsheet ID'})
            } else if (error.code === 429) {
                return res.status(429).json({message: "Hit Sheets API rate limit"})
            } else if (error.code >= 500) {
                return res.status(500).json({message: "Sheets API is currently unavailable"})
            }
        }
        return res.status(500).json({message: "An unexpected error occurred"})
    }
})

app.listen(PORT, () => {
    console.log(`Backend server is up and running on port ${PORT}`)
})
