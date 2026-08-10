import express, { type Request, type Response } from "express";
import { pool } from "./db.js";

const app = express();

app.use(express.json());

app.get("/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "Running....",
            database: result.rows[0],
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            status: "Database connection failed",
        });
    }
});

app.post("/users", (req: Request, res: Response) => {
    const { name, email } = req.body;
    res.send({
        "status": "user created successfully.",
        "user": {
            "name": name,
            "email": email
        }
    })
})


app.listen(3000, () => {
    console.log("Server is running on port 3000.")
});