import type { NextFunction, Request, Response } from "express";
import { validateId } from "../schema.js";

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