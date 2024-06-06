const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_PAYMENT_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xnvb7mx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollection = client.db("contestDB").collection("users");
        const contestsCollection = client.db("contestDB").collection("contests");


        // user related api


        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            // if (email !== req.decoded.email) {
            //     res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        app.get('/users/creator/:email', async (req, res) => {
            const email = req.params.email;
            // if (email !== req.decoded.email) {
            //     res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let creator = false;
            if (user) {
                creator = user?.role === 'creator'
            }
            res.send({ creator })
        })



        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)

        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/users/creator/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'creator'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // contest related api 

        app.get('/contests', async (req, res) => {
            const result = await contestsCollection.find().toArray();
            res.send(result)
        })

        app.get('/contests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await contestsCollection.findOne(query)
            res.send(result)
        })

        app.get('/contests/creator/:email', async (req, res) => {
            const email = req.params.email;
            const query = { creatorEmail: email };
            const result = await contestsCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/contests/confirm/:status', async (req, res) => {
            const status = req.params.status;
            const query = { status: status };
            const result = await contestsCollection.find(query).toArray();
            res.send(result)

        })

        app.post('/contests', async (req, res) => {
            const item = req.body;
            const result = await contestsCollection.insertOne(item);
            res.send(result)

        })

        app.patch('/contests/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'success'
                }
            }
            const result = await contestsCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/contests/update/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    name:item.name,
                    image:item.image,
                    price:item.price,
                    category:item.category,
                    description:item.description,
                    prizeMoney:item.prizeMoney,
                    instruction:item.instruction,
                    deadline:item.deadline,
                    creatorName:item.creatorName,
                    creatorEmail:item.creatorEmail,
                    creatorPhoto:item.creatorPhoto
                }
            }
            const result = await contestsCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.delete('/contests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await contestsCollection.deleteOne(query)
            res.send(result)
        })

        // payment related api 

        app.post('/create-payment-intent',async(req,res)=>{
            const{price}=req.body;
            const amount = parseInt(price*100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount:amount,
                currency:"usd",
                payment_method_types:["card"]
            });
            res.send({
                clientSecret:paymentIntent.client_secret
            })
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
    res.send('contest craze is running')
})
app.listen(port, () => {
    console.log(`contest craze is running port on :${port}`)
})