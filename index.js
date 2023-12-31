const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000

// middleware
app.use(express.json())
app.use(cors({
    origin: [
        'http://localhost:5173', 'http://localhost:5174', "https://foodbuzz-rootnure.web.app", "https://foodbuzz-rootnure.firebaseapp.com"
    ],
    credentials: true
}))
app.use(cookieParser())

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ msg: 'Unauthorized access' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ msg: 'Unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3al0nc5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const dbConnect = async () => {
    try {
        client.connect()
        console.log('DB Connected Successfully✅')
    } catch (error) {
        console.log(error.name, error.message)
    }
}
dbConnect()


// collections
const foodCollection = client.db("foodbuzz").collection("foodItems");
const userCollection = client.db("foodbuzz").collection("users");
const purchaseCollection = client.db("foodbuzz").collection("purchase");


app.get('/', (req, res) => {
    res.send({ msg: 'Foodbuzz is online...' })
})

// jwt related api
app.post("/api/v1/token", async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" })
    res
        .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 60 * 60 * 1000
        })
        .send({ success: true })
})

app.post('/api/v1/jwt', async (req, res) => {
    try {
        const user = req.body
        const token = jwt.sign(user, process.env.JWT_SECRET, {
            expiresIn: '1d',
        })
        res
            .cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
            .send({
                status: true,
            })
    } catch (error) {
        res.send({
            status: true,
            error: error.message,
        })
    }
})

app.post("/api/v1/logout", async (req, res) => {
    res
        .clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 0
        })
        .send({ success: true })
})

// purchase related api
app.get("/api/v1/order-history", verifyToken, async (req, res) => {
    const { email } = req.query;
    const tokenEmail = req.decoded.email;
    if (email !== tokenEmail) {
        res.status(403).send({ msg: "Forbidden access" });
        return;
    }
    const query = { customer_email: email };
    const result = await purchaseCollection.find(query).toArray();
    res.send(result);
})

app.post("/api/v1/order-history", async (req, res) => {
    const data = req.body;
    const result = await purchaseCollection.insertOne(data);
    res.send(result);
})

app.delete("/api/v1/delete-order", async (req, res) => {
    const { id } = req.query;
    const query = { _id: new ObjectId(id) };
    const result = await purchaseCollection.deleteOne(query);
    res.send(result);
})

// users related apis
app.get("/api/v1/user", async (req, res) => {
    const { uId: id } = req.query;
    const options = {
        projection: { _id: 0, displayName: 1, email: 1, photoURL: 1 }
    }
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.findOne(query, options);
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
app.get('/api/v1/all-foods', async (req, res) => {
    const { page, limit } = req.query;
    const dataCount = await foodCollection.estimatedDocumentCount();
    const result = await foodCollection.find().skip(parseInt(page) * parseInt(limit)).limit(parseInt(limit)).toArray();
    res.send({ dataCount, result });
})

app.get("/api/v1/all-searched-foods", async (req, res) => {
    const { page, limit, searchText } = req.query;
    if (searchText === "") {
        const dataCount = await foodCollection.estimatedDocumentCount();
        const result = await foodCollection.find().skip(parseInt(page) * parseInt(limit)).limit(parseInt(limit)).toArray();
        res.send({ dataCount, result });
        return;
    }
    const allFood = await foodCollection.find().toArray();
    const dataToSkip = parseInt(page) * parseInt(limit);
    const result = allFood.filter(food => food.food_name.toLowerCase().includes(searchText.toLowerCase())).slice(dataToSkip, dataToSkip + parseInt(limit));
    res.send({ dataCount: result.length, result });
})

app.get('/api/v1/single-food/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await foodCollection.findOne(query);
    res.send(result || {});
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

app.get("/api/v1/my-foods", verifyToken, async (req, res) => {
    const { email } = req.query;
    const tokenEmail = req.decoded?.email;
    if (email !== tokenEmail) {
        res.status(403).send({ msg: "Forbidden access" });
    } else {
        const options = {
            projection: { food_name: 1, size: 1, food_img: 1, price: 1, made_by: 1 }
        }
        const allFoods = await foodCollection.find({}, options).toArray();
        const userAddedFoods = allFoods.filter(food => food.made_by.email === email);
        res.send(userAddedFoods);
    }
})

app.patch("/api/v1/update-food", async (req, res) => {
    const { id } = req.query;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const data = req.body;
    const dataToUpdate = {
        $set: {
            ...data
        },
    };
    const result = await foodCollection.updateOne(filter, dataToUpdate, options);
    res.send(result);
})




app.listen(port, () => {
    console.log(`Foodbuzz is running on port ${port}`)
})