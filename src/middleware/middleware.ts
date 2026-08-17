import type { NextFunction, Request, Response } from "express";
import { validateId } from "../schema.js";
import jwt from "jsonwebtoken";

export const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
    const parsedResult = validateId.safeParse(req.params);

    if (!parsedResult.success) {
        return res.status(400).json({
            message: "Invalid id",
            errors: parsedResult.error.flatten().fieldErrors,
        });
    }

    next();
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {

    try {
        const accessToken = req.headers.authorization?.split(" ")[1];

        if (!accessToken) return res.status(401).json({
            message: "No token provided."
        })

        const { userId } = jwt.verify(accessToken, process.env.JWT_SECRET as jwt.Secret) as { userId: number };
        req.userId = userId ;
        next();

    } catch (e: any) {
        return res.status(401).json({ message: "Invalid or expired token." })
    }
}