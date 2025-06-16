require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy

const app = express()

const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

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
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, (accessToken, refreshToken, profile, done) => { // verify function
    profile.accessToken = accessToken
    done(null, profile)
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

app.listen(PORT, () => {
    console.log(`Backend server is up and running on port ${PORT}`)
})