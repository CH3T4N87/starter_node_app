import { Router } from "express";
import { authMiddleware, validateIdParam } from "../middleware/middleware.js";
import { pool } from "../db.js";
import { createTodoSchema, updateTodoSchema } from "../schema.js";

const router = Router();

router.get("/todos", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const result = await pool.query('SELECT * from todos WHERE user_id = $1', [userId]);
        res.status(200).json({
            "todos": result.rows
        })
    } catch (e: any) {
        next(e);
    }
});

router.get("/todos/:id", authMiddleware, validateIdParam, async (req, res, next) => {
    try {
        const { id } = req.params;

        const todo = (await pool.query("SELECT * FROM todos WHERE id = $1", [id])).rows[0];

        if (!todo) {
            return res.status(404).json({
                message: "Todo not found"
            })
        }

        if (!(todo.user_id === req.userId)) {
            return res.status(403).json({
                message: "You don't have enought permissions to view this todo."
            })
        }

        res.status(200).json({
            todo
        })

    } catch (e: any) {
        next(e);
    }
})

router.post("/todos", authMiddleware, async (req, res, next) => {
    try {

        const parsedResult = createTodoSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: parsedResult.error.flatten().fieldErrors
            })
        }
        const { title, completed = false } = parsedResult.data;

        const userId = req.userId;

        const result = await pool.query(`INSERT INTO todos (title, completed, user_id) VALUES ($1, $2, $3) RETURNING *`, [title, completed, userId]);

        res.status(201).json({
            "status": "todo created successfully.",
            "todo": result.rows[0],
        });

    } catch (e: any) {
        next(e);
    }
})

router.patch("/todos/:id", authMiddleware, validateIdParam, async (req, res, next) => {
    try {
        const { id } = req.params;

        const parsedResult = updateTodoSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsedResult.error.flatten().fieldErrors,
            });
        }

        const todo = (await pool.query("SELECT * FROM todos WHERE id = $1", [id])).rows[0];

        if (!todo) {
            return res.status(404).json({ message: "Todo not found" });
        }

        if (todo.user_id !== req.userId) {
            return res.status(403).json({ message: "You don't have permission to update this todo" });
        }

        const { title, completed } = parsedResult.data;

        const hasTitle = title !== undefined;
        const hasCompleted = completed !== undefined;

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (hasTitle) {
            fields.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if (hasCompleted) {
            fields.push(`completed = $${paramIndex++}`);
            values.push(completed);
        }

        values.push(id);

        const result = await pool.query(`UPDATE TODOS SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`, values);


        res.json({
            "status": "todo updated successfully.",
            "todo": result.rows[0]
        });
    } catch (e: any) {
        next(e);
    }
});

router.delete("/todos/:id", authMiddleware, validateIdParam, async (req, res, next) => {
    try {
        const { id } = req.params;

        const todo = (await pool.query("SELECT * from todos WHERE id = $1", [id])).rows[0];

        if (!todo) {
            return res.status(404).json({
                message: "Todo not found"
            })
        }

        if (!(req.userId === todo.user_id)) {
            return res.status(403).json({
                message: "You don't have enough permissions."
            })
        }
        const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Todo not found" });
        }

        res.json({
            status: "todo deleted successfully.",
            todo: result.rows[0]
        });
    } catch (e: any) {
        next(e);
    }
});


export default router;