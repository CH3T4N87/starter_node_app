import express, { type Request, type Response, type NextFunction } from "express";
import { pool } from "./db.js";
import { createTodoSchema, signupSchema, updateTodoSchema, validateId } from "./schema.js";
import { authMiddleware, validateIdParam } from "./middleware/middleware.js";
import { errorHandler } from "./errorHandler.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import authRouter from "./routes/auth.js";


dotenv.config();

const app = express();

app.use(express.json());


app.get("/health", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "Running....",
            database: result.rows[0],
        });
    } catch (e: any) {
        next(e);
    }
});






//auth
app.use("/", authRouter);









app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}.`)
});