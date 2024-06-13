import * as dotenv from "dotenv";
import Express from "express";
import http from "http";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import Database from "./config/database";
import { swaggerOptions } from "./config/swagger.config";
import initializeRouters from "./routes/index.routes";
import { initializeMiddleware } from "./config/middlewares.config";
dotenv.config({ path: __dirname + "/.env" });

let app: Express.Application | undefined = undefined;
const PORT = process.env.PORT || 3001;
const URI = process.env.MONGO_URI;

const db = new Database(URI!, {});
db.connect()
  .then(() => {
    console.log("Connected to database");
  })
  .catch((err: any) => console.error("Error connecting to database", err));

app = Express();
initializeMiddleware(app);

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.get("/server-status", (req, res) => {
  res.status(200).send({ message: "Server is up and running!" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
initializeRouters(app);
process.on("SIGINT", async () => {
  try {
    await db.disconnect();
    console.log("Database disconnected");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

http.createServer(app).listen(PORT, () => {
  console.log(`Server listening on ${PORT}: http://localhost:${PORT}/api-docs`);
});
