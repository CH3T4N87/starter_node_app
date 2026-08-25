import { Router } from "express";
import { signupSchema } from "../schema.js";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();


router.post("/signup", async (req, res, next) => {
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


router.post("/login", async (req, res, next) => {
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

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET as jwt.Secret,
            {
                expiresIn: "7d"
            }
        )

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const result = await pool.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *", [user.id, refreshToken, expiresAt]);

        res.status(200).json({
            accessToken,
            refreshToken
        })
    } catch (e: any) {
        next(e);
    }
});

router.post("/refresh", async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                message: "No token provided."
            });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as jwt.Secret);

        const dbEntry = (await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [refreshToken])).rows[0];


        if (!dbEntry || (dbEntry.expires_at.valueOf() <= Date.now())) {
            return res.status(401).json({
                message: "Invalid or expired token."
            });
        }

        const accessToken = jwt.sign({ userId: dbEntry.user_id }, process.env.JWT_SECRET as jwt.Secret, { expiresIn: "15m" });

        res.status(200).json({
            accessToken
        })


    } catch (e: any) {
        return res.status(401).json({
            message: "Invalid or expired token."
        })
    }
})



export default router;