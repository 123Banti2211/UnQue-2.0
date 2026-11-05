import {HttpError} from "../models/error.js"
import {Availability} from "../models/availability.js"
import { Appointment } from "../models/appointment.js";
import moment from "moment";
import mongoose from "mongoose";



// Controller to set availability
const setAvailability = async (req, res, next) => {
  try {
    console.log(req.user);  // Log req.user to see if it's coming through
    
    const { startTime, endTime } = req.body;
    
    if (!req.user || !req.user.id) {
      return next(new HttpError("No professor ID found", 400));
    }

    // Ensure startTime is before endTime
    if (new Date(startTime) >= new Date(endTime)) {
      return next(new HttpError("Start time must be before end time", 400));
    }

    // Check for overlapping availability
    const existingAvailability = await Availability.findOne({
      professorId: req.user.id,
      $or: [
        { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } }, // Start overlaps
        { startTime: { $lt: new Date(startTime) }, endTime: { $gt: new Date(endTime) } }  // End overlaps
      ]
      // New time starts before an old one finishes
      // New time finishes after an old one start
    });

    if (existingAvailability) {
      return next(new HttpError("This time slot is already added for you professor", 400));
    }

    // Create new availability entry
    const availability = new Availability({
      professorId: req.user.id,  // Ensure that professorId is coming from req.user._id
      startTime,
      endTime,
    });

    await availability.save();

    const formattedStartTime = moment.utc(availability.startTime).format('MMMM Do YYYY, h:mm:ss a');
    const formattedEndTime = moment.utc(availability.endTime).format('MMMM Do YYYY, h:mm:ss a');

    res.status(201).json({
      message: "Availability added successfully",
      availability: {
        ...availability.toObject(),  // Spreading existing availability data
        startTime: formattedStartTime, // Replacing with formatted date
        endTime: formattedEndTime, // Replacing  with formatted date
      },
    });
  } catch (error) {
    console.log(error);  // Log error for better debugging
    return next(new HttpError("Adding availability failed", 500));
  }
};



  const cancelAppointments = async(req,res,next) => {
    try {
      const { studentId } = req.params;  // Student's ID from params
      const professorId = req.user.id;   // Professor's ID from the authenticated user
      console.log('Professor ID:', professorId);  // This should match the professor's ID in the appointment
      console.log('Student ID:', studentId);

      // Ensuring professor is authenticated and studentId is provided
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return next(new HttpError("Invalid or missing student ID", 400));
      }
  
      // Finding the  appointments between this professor and student
      const appointments = await Appointment.find({
        studentId: new mongoose.Types.ObjectId(studentId),
        professorId: new mongoose.Types.ObjectId(professorId),
        status: 'booked' // Only cancel booked appointments
      });
  
      if (!appointments || appointments.length === 0) {
        return next(new HttpError("No appointments found to cancel", 404));
      }
  
      // Updating the status of all appointments to "canceled"
      await Appointment.updateMany(
        {
          studentId: new mongoose.Types.ObjectId(studentId),
          professorId: new mongoose.Types.ObjectId(professorId),
          status: 'booked'
        },
        { status: 'canceled' }  //  the status  needs to be canceled
      );
  
      res.status(200).json({
        message: `All appointments between professor ${professorId} and student ${studentId} have been canceled.`
      });

    } catch (error) {
      console.error("Error cancelling appointments:", error);
      return next(new HttpError(error));
    }
  };

// Controller to update an existing free appointment timing without removing it from DB
const updateAvailability = async (req, res, next) => {
  try {
    const availabilityId = req.params.availabilityId || req.body.availabilityId;
    const { startTime, endTime } = req.body;
    const professorId = req.user.id;

    if (!availabilityId || !mongoose.Types.ObjectId.isValid(availabilityId)) {
      return next(new HttpError("Invalid or missing availability slot ID", 400));
    }

    if (!startTime || !endTime) {
      return next(new HttpError("Both startTime and endTime are required", 400));
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new HttpError("Invalid date format provided for startTime or endTime", 400));
    }

    if (start >= end) {
      return next(new HttpError("Start time must be before end time", 400));
    }

    // Find the existing availability slot
    const availability = await Availability.findById(availabilityId);
    if (!availability) {
      return next(new HttpError("Availability slot not found", 404));
    }

    // Verify that the slot belongs to this authenticated professor
    if (availability.professorId.toString() !== professorId.toString()) {
      return next(new HttpError("Access denied: You can only update your own availability slots", 403));
    }

    // Check if there are active (booked) appointments in this slot window
    const bookedAppointment = await Appointment.findOne({
      professorId: new mongoose.Types.ObjectId(professorId),
      status: "booked",
      time: { $gte: availability.startTime, $lte: availability.endTime }
    });

    if (bookedAppointment) {
      return next(new HttpError("Cannot update timing: This slot already has an active booked appointment. Only free slots can be updated.", 400));
    }

    // Check for overlap with other availability slots of this professor (excluding current slot)
    const overlappingSlot = await Availability.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(availabilityId) },
      professorId: new mongoose.Types.ObjectId(professorId),
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    });

    if (overlappingSlot) {
      return next(new HttpError("The updated time slot overlaps with another existing availability slot", 400));
    }

    // Update existing document in place without removing it from database
    availability.startTime = start;
    availability.endTime = end;
    await availability.save();

    const formattedStartTime = moment.utc(availability.startTime).format('MMMM Do YYYY, h:mm:ss a');
    const formattedEndTime = moment.utc(availability.endTime).format('MMMM Do YYYY, h:mm:ss a');

    res.status(200).json({
      message: "Free slot timing updated successfully without removing existing record",
      availability: {
        _id: availability._id,
        id: availability._id,
        professorId: availability.professorId,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        rawStartTime: availability.startTime,
        rawEndTime: availability.endTime
      }
    });

  } catch (error) {
    console.error("Error updating availability timing:", error);
    return next(new HttpError("Failed to update availability slot", 500));
  }
};

export { setAvailability, cancelAppointments, updateAvailability };