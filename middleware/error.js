
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.code || err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
    res.status(typeof statusCode === "number" ? statusCode : 500).json({
        message: err.message || "An unexpected error occurred"
    });
};
