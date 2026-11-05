import express from "express";
import { setAvailability, cancelAppointments, updateAvailability } from "../controllers/proff.js";
import { authMiddleware } from "../middleware/auth.js"; 
import { profMiddleware } from "../middleware/auth.js"; 
const router = express.Router();

// Route for professor to set availability slot
router.post("/availability", authMiddleware, profMiddleware, setAvailability);

// Route for professor to update an existing free appointment timing without removing it from db
router.patch("/availability/:availabilityId", authMiddleware, profMiddleware, updateAvailability);
router.patch("/availability", authMiddleware, profMiddleware, updateAvailability);

// Route to cancel appointments between professor and student - Only accessible to professors
router.patch("/cancel-appointments/:studentId", authMiddleware, profMiddleware, cancelAppointments);

export default router;
