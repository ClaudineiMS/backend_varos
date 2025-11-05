import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import usersRouter from "./routes/users.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // URL do front
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());

// Rotas
app.use("/users", usersRouter);

// Inicializa o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
