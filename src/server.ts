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

app.get("/todos", async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * from todos');
        res.status(200).json({
            "todos": result.rows
        })
    } catch (e: any) {
        res.status(500).json({
            "message": "Something went wrong"
        })
    }
})

app.post("/todos", async (req: Request, res: Response) => {
    try {
        const { title, completed } = req.body;
        const result = await pool.query(`INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *`, [title, completed]);
        res.status(201).json({
            "status": "todo created successfully.",
            "todo": result.rows[0]
        })
    } catch (e: any) {
        res.status(500).json({
            "error": "Something went wrong"
        })
    }
})

app.patch("/todos/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, completed } = req.body;

        const hasTitle = title !== undefined;
        const hasCompleted = completed !== undefined;

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if(hasTitle){
            fields.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if(hasCompleted){
            fields.push(`completed = $${paramIndex++}`);
            values.push(completed);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: "No fields provided to update" });
        }

        values.push(id);

        const result = await pool.query(`UPDATE TODOS SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`, values);

        if(result.rows.length === 0) return res.status(404).json({
            "message": "No such record found"
        })
        
        res.json({
            "status": "todo updated successfully.",
            "todo": result.rows[0]
        });
    } catch (e: any) {
        res.status(500).json({
            "message": "Something went wrong !!",
            "error": e
        })
    }
});

app.delete("/todos/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Todo not found" });
        }

        res.json({
            status: "todo deleted successfully.",
            todo: result.rows[0]
        });
    } catch (e: any) {
        res.status(500).json({ message: "Something went wrong !!" });
    }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000.")
});