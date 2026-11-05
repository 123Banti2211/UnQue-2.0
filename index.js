import express from "express"
import bodyParser from "body-parser"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet"
import morgan from "morgan" 
import {notFound, errorMiddleware} from "./middleware/error.js"

// import errorMiddleware from "./middleware/error.js"
import userRoutes from "./routes/user.js"
import professorRoutes from "./routes/proff.js"
import generalRoutes from "./routes/general.js"


dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(morgan("common"))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))
app.use(cors());
// Health check endpoint for testing deployment and network connectivity
app.get("/", (req, res) => {
  res.status(200).json({ message: "UnQue College Appointment API is running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// The order of these routes are important
app.use('/users', userRoutes);
app.use('/professor', professorRoutes);
app.use('/general', generalRoutes);
app.use(notFound);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5001;

// DocumentDB / MongoDB connection options
const mongooseOptions = {};
if (process.env.DOCDB_CA_PATH) {
  mongooseOptions.tls = true;
  mongooseOptions.tlsCAFile = process.env.DOCDB_CA_PATH;
}

mongoose.connect(process.env.MONGO_URL, mongooseOptions)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port: ${PORT}`));  
  })
  .catch((error) => console.log(`${error} did not connect`)); 

