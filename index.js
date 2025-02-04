const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_PAYMENT_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "https://contest-craze.web.app",
        "https://contest-craze.firebaseapp.com",
      ]
    })
  );
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
        // await client.connect();

        const userCollection = client.db("contestDB").collection("users");
        const contestsCollection = client.db("contestDB").collection("contests");
        const paymentCollection = client.db("contestDB").collection("payments");
        const submitContestCollection = client.db("contestDB").collection("submitContest");


        // jwt

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        // middleware

        const verifyToken = (req, res, next) => {
            // console.log("Inside VerifyToken",req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next()
            });

        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        const verifyCreator = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isCreator = user?.role === "creator";
            if (!isCreator) {
                res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }



        // user related api


        app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
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

        app.get('/contests/creator/:email',verifyToken,verifyCreator, async (req, res) => {
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

        app.post('/contests',verifyToken,verifyCreator, async (req, res) => {
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

        app.patch('/contests/adminComment/:id', async (req, res) => {
            const id = req.params.id;
            const comment = req.body;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    comment: comment
                }
            }
            const result = await contestsCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/contests/participant/:id', async (req, res) => {
            const id = req.params.id;
            const { participants } = req.body;
            // console.log("Received participants value:", participants);

            const updatedParticipants = Number(participants);


            // console.log("Converted participants value:", updatedParticipants);
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    participants: Number(participants)
                }
            }
            const result = await contestsCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/contests/update/:id',verifyToken,verifyCreator, async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    name: item.name,
                    image: item.image,
                    price: item.price,
                    category: item.category,
                    description: item.description,
                    prizeMoney: item.prizeMoney,
                    instruction: item.instruction,
                    deadline: item.deadline,
                    creatorName: item.creatorName,
                    creatorEmail: item.creatorEmail,
                    creatorPhoto: item.creatorPhoto
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

        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // console.log(amount,'payment inside')
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        app.get('/payments', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result)
        })

        app.get('/payments/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment)
            res.send(paymentResult)

        })

        app.patch('/payments/submitted/:id',async(req,res)=>{
            const id=req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    contestSubmit: 'success',
                    
                }
            }
            const result = await paymentCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // submitContest related

        app.get('/submitContest/byEmail/:email',async(req,res)=>{
            const email = req.params.email;
            const query = { participantEmail: email };
            const result = await submitContestCollection.find(query).toArray();
            // console.log(result)
            res.send(result)
        })

        app.get('/submitContest/contestWinner/:winner', async(req,res)=>{
            const winner = req.params.winner;
            const query = { contestWinner: winner };
            const result = await submitContestCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/submitContest/:name',async (req,res)=>{
            const name=req.params.name;
            const query={contestName:name}
            const result = await submitContestCollection.find(query).toArray();
            res.send(result)
        })

        app.patch('/submitContest/:id',verifyToken,verifyCreator,async(req,res)=>{
            const id=req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    contestWinner: 'winner',
                    
                }
            }
            const result = await submitContestCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.post('/submitContest',async(req,res)=>{
            const submitContest=req.body;
            const submitResult= await submitContestCollection.insertOne(submitContest)
            res.send(submitResult)
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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