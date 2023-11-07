const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const port = 5000

// middleware
app.use(express.json())
app.use(cors())
app.use(cookieParser())



app.get('/', (req, res) => {
    res.send('Foodbuzz is online...')
})

app.listen(port, () => {
    console.log(`Foodbuzz is running on port ${port}`)
})