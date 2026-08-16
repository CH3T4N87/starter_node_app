import express, { type Request, type Response, type NextFunction } from "express";
import { pool } from "./db.js";
import { createTodoSchema, signupSchema, updateTodoSchema, validateId } from "./schema.js";
import { validateIdParam } from "./middleware/middleware.js";
import { errorHandler } from "./errorHandler.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";


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

app.get("/todos", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query('SELECT * from todos');
        res.status(200).json({
            "todos": result.rows
        })
    } catch (e: any) {
        next(e);
    }
})

app.post("/todos", async (req: Request, res: Response, next: NextFunction) => {
    try {

        const parsedResult = createTodoSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: parsedResult.error.flatten().fieldErrors
            })
        }
        const { title, completed = false } = parsedResult.data;
        const result = await pool.query(`INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *`, [title, completed]);
        res.status(201).json({
            "status": "todo created successfully.",
            "todo": result.rows[0]
        })
    } catch (e: any) {
        next(e);
    }
})

app.patch("/todos/:id", validateIdParam, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const parsedResult = updateTodoSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsedResult.error.flatten().fieldErrors,
            });
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

        if (result.rows.length === 0) return res.status(404).json({
            "message": "No such record found"
        })

        res.json({
            "status": "todo updated successfully.",
            "todo": result.rows[0]
        });
    } catch (e: any) {
        next(e);
    }
});

app.delete("/todos/:id", validateIdParam, async (req: Request, res: Response, next: NextFunction) => {
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
        next(e);
    }
});


//auth

app.post("/signup", async (req, res, next) => {
    try {
        const parsedResult = signupSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                "message": "Validation failed",
                error: parsedResult.error.flatten().fieldErrors
            })
        }

        const { email, password } = parsedResult.data;

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *', [email, hashedPassword]);

        res.status(201).json({
            message: "user succcesfully registered",
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email
            }
        })

    } catch (e: any) {
        if (e.code === "23505") return res.status(409).json({ message: "User already exists" })
        next(e);
    }
});


app.post("/login", async (req, res, next) => {
    try {
        const parsedResult = signupSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: parsedResult.error.flatten().fieldErrors
            })
        }

        const { email, password } = parsedResult.data;

        const user = (await pool.query("Select * from users WHERE email = $1", [email])).rows[0];

        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

        const accessToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET as jwt.Secret,
            {
                expiresIn: "15m"
            }
        );

        res.status(200).json({
            accessToken
        })
    } catch (e: any) {
        next(e);
    }
})



app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}.`)
});