require('dotenv').config();
const express= require('express')
const {dbConnected} = require('./config/dataBase')
const {routes} = require('./routes/auth')
const doctorRoutes = require("./routes/doctorRoutes");
const family= require('./routes/familyRoutes')
const reportRoutes = require("./routes/reportRoutes");


const cookieParser= require('cookie-parser')
const cors= require('cors')
 



const app= express()

const port= process.env.PORT
app.use(express.json());
app.use(cookieParser()); 
app.use(cors({
   origin: ["http://localhost:5173", "https://your-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // ✅ exact frontend URL
  credentials: true               // ✅ allow cookies, headers, etc.
}));

app.use('/auth',routes)
app.use('/api/doctors',doctorRoutes)
app.use('/api/family',family)
app.use("/api/reports", reportRoutes);

app.get('/',(req,res)=>{
    res.send("API is running....")
});

// app.use("/api/doctors", doctorRoutes);


dbConnected()
    .then(() => console.log("Connected to database successfully"))
    .catch(err => console.error("Could not connect to database", err));



app.listen(port || 3000,()=>{
    console.log("welcom",port);
    
})

 
