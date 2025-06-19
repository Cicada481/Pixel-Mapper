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

// Checks if the user entered a positive number
const validatePositiveInt = (userEnteredData) => {
    const parsedData = parseInt(userEnteredData)
    if (parsedData === NaN || parsedData <= 0) {
        return undefined
    }
    return parsedData
}

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
        // TBD add back later
        // if (!req.user) {
        //     return res.status(401).json({message: 'not logged in'})
        // }

        // Image details are contained in req.file

        // Parse data entered by the user via form
        const numColumns = validatePositiveInt(req.body.numColumns)
        const cellWidth = validatePositiveInt(req.body.cellWidth)
        const cellHeight = validatePositiveInt(req.body.cellHeight)
        const sheetUrl = req.body.sheetUrl
        console.log('Form dimensions data', numColumns, cellWidth, cellHeight)
        console.log('Spreadsheet URL', sheetUrl)

        // Parse URL for spreadsheet ID
        const spreadsheetIdStart = sheetUrl.indexOf('/d/') + '/d/'.length
        const spreadsheetIdEnd = sheetUrl.indexOf('/edit')
        if (spreadsheetIdStart === -1 || spreadsheetIdEnd === -1) {
            console.log(sheetUrl)
            return res.status(400).json({message: 'Link missing spreadsheet id'})
        }
        const spreadsheetId = sheetUrl.substring(spreadsheetIdStart, spreadsheetIdEnd)

        // Parse URL for sheet ID
        const sheetIdStart = sheetUrl.indexOf('?gid=') + '?gid='.length
        const sheetIdEnd = sheetUrl.indexOf('#gid=')
        if (sheetIdStart === -1 || sheetIdEnd === -1) {
            console.log(sheetUrl)
            return res.status(400).json({message: 'Link missing sheet id'})
        }
        const sheetId = sheetUrl.substring(sheetIdStart, sheetIdEnd)
        
        // Extract the colors of the uploaded image into a 2D array
        const image = await Jimp.read(req.file.path)
        image.resize({w: numColumns}) // Bilinear interpolation
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
        // TBD Fix hardcoding of access token
        oauth2Client.setCredentials({access_token: process.env.TEST_ACCESS_TOKEN || req.user.accessToken})
        const sheets = google.sheets({version: 'v4', auth: oauth2Client})

        // Find the current dimensions (number of rows and cols) of the sheet
        const targetSpreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId
        })
        const targetSheet = targetSpreadsheetResponse.data.sheets.find(sheetItem => {
            return sheetItem.properties.sheetId === parseInt(sheetId)
        })
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

        // Modify the width of cells in the image if the user asked
        if (cellWidth) {
            const updateCellWidths = { // UpdateDimensionPropertiesRequest object
                properties: {
                    pixelSize: cellWidth
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

        // Modify the height of cells in the image if the user asked
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
        
        // Create an array of RowData objects and fill it
        // Needed for creation of UpdateCellsRequest
        const rows = []
        for (let i = 0; i < colorGrid.length; i++) {
            const rowValues = []
            for (let j = 0; j < colorGrid[0].length; j++) {
                // Set color of spreadsheet cell
                const currentColor = colorGrid[i][j]
                const cellData = { // a CellData object
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: {
                                red: currentColor.r / 255,
                                green: currentColor.g / 255,
                                blue: currentColor.b / 255
                            }
                        }
                    }
                }
                rowValues.push(cellData)
            }
            rows.push({values: rowValues}) // Append this row of cell values
        }

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
        const batchUpdateResponse = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests
            }
        })
        console.log("After Sheets API call")
        // TBD add error checking (e.g. if API call fails)
        // console.log('Response', batchUpdateResponse)

        // TBD remove image

        // Send back parsed IDs
        // TBD Send other success or failure response
        res.json({
            spreadsheetId,
            sheetId,
            fileName: req.file.originalname
        })
    } catch (error) {
        console.error(error.stack)
        res.status(500).json({message: "An unexpected error occured"})
    }
})

app.listen(PORT, () => {
    console.log(`Backend server is up and running on port ${PORT}`)
})

