const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const port = 5000

// middleware
app.use(express.json())
app.use(cors())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3al0nc5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // collections
        const foodCollection = client.db("foodbuzz").collection("foodItems");
        const userCollection = client.db("foodbuzz").collection("users");

        // users related apis
        app.get("/api/v1/user", async (req, res) => {
            const { uId: id } = req.query;
            console.log(req.query);
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        app.post("/api/v1/user", async (req, res) => {
            const data = req.body;
            const result = await userCollection.insertOne(data);
            res.send(result);
        })

        app.patch("/api/v1/user", async (req, res) => {
            const { uId: id } = req.query;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const dataToUpdate = {
                $set: {
                    ...data
                }
            }
            const result = await userCollection.updateOne(filter, dataToUpdate, options);
            res.send(result);
        })

        // food related apis
        app.get('/api/v1/all-food', async (req, res) => {
            const { page, limit } = req.query;
            const dataCount = await foodCollection.estimatedDocumentCount();
            const result = await foodCollection.find().skip(parseInt(page) * parseInt(limit)).limit(parseInt(limit)).toArray();
            res.send({ dataCount, result });
        })

        app.get('/api/v1/single-food/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query);
            res.send(result);
        })

        app.get('/api/v1/top-foods', async (req, res) => {
            const { foodCount } = req.query;
            const options = {
                sort: { sell_count: -1 },
                projection: { food_name: 1, food_img: 1, category: 1, price: 1, sell_count: 1 }
            }
            const result = await foodCollection.find({}, options).limit(parseInt(foodCount)).toArray();
            res.send(result);
        })

        app.post('/api/v1/add-new', async (req, res) => {
            const data = req.body;
            const result = await foodCollection.insertOne(data);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Foodbuzz is online...')
})

app.listen(port, () => {
    console.log(`Foodbuzz is running on port ${port}`)
})