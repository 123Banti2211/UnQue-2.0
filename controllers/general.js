import { Availability } from "../models/availability.js";
import { HttpError } from "../models/error.js";
import {Appointment} from "../models/appointment.js"
import mongoose from 'mongoose';
import moment from 'moment';  

const getAvailableSlots = async (req, res, next) => {
    try {
        const { professorId } = req.params;

        
        console.log("Professor ID:", professorId, "Type:", typeof professorId);

        // Check if professorId is valid
        if (!mongoose.Types.ObjectId.isValid(professorId)) {
            return next(new HttpError("Invalid professor ID format", 400));
        }

        // Find availability slots for the professor
        const availability = await Availability.find({ professorId: new mongoose.Types.ObjectId(professorId) });

        if (!availability || availability.length === 0) {
            return next(new HttpError("No availability found for this professor", 404));
        }

        // Format the available slots using moment.js
        const availableSlots = availability.map(avail => ({
            id: avail._id,
            _id: avail._id,
            startTime: avail.startTime,
            endTime: avail.endTime,
            StartTime: moment.utc(avail.startTime).format('MMMM Do YYYY, h:mm:ss a'),
            EndTime: moment.utc(avail.endTime).format('MMMM Do YYYY, h:mm:ss a'),
        }));

        res.status(200).json({ availableSlots });
    } catch (error) {
        return next(new HttpError("Failed to fetch availability", 500));
    }
};

const bookAppointment = async (req, res, next) => {
  try {
    const { professorId, time } = req.body; // Professor's ID and time (T1) for booking
    const studentId = req.user.id; // Student's ID from the authenticated user

    if (!time || !professorId) {
      return next(new HttpError("Professor ID and time are required", 400));
    }

    const formattedTime = moment(time).utc().toDate(); // Convert time to UTC Date object

    // professor has available slots during the provided time
    const availability = await Availability.findOne({
      professorId: new mongoose.Types.ObjectId(professorId),
      startTime: { $lte: formattedTime }, // Check if the time is greater than or equal to startTime
      endTime: { $gte: formattedTime },   // Check if the time is less than or equal to endTime
    });

    // Log the data for debugging
    console.log('Formatted Time:', formattedTime);
    console.log('Availability:', availability);

    if (!availability) {
      return next(new HttpError("Selected time is not available for booking", 400));
    }

    // Check if the student already has a booking for this time
    const existingAppointment = await Appointment.findOne({
      studentId: new mongoose.Types.ObjectId(studentId),
      professorId: new mongoose.Types.ObjectId(professorId),
      time: formattedTime,
    });

    if (existingAppointment) {
      return next(new HttpError("You already have an appointment for this time", 400));
    }

    // Creating the appointment
    const appointment = new Appointment({
      studentId: new mongoose.Types.ObjectId(studentId),
      professorId: new mongoose.Types.ObjectId(professorId),
      time: formattedTime, // Use formatted time
    });

    await appointment.save();

    // Format the time using moment.js for response
    const formattedAppointmentTime = moment.utc(appointment.time).format('MMMM Do YYYY, h:mm:ss a');

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        studentId: appointment.studentId,
        professorId: appointment.professorId,
        time: formattedAppointmentTime, // Return formatted time
        status: appointment.status,
      },
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    return next(new HttpError("Failed to book appointment", 500));
  }
};


  const getStudentAppointments = async (req, res, next) => {
    try {
      const studentId = req.user.id;  // Extract the student ID from the token (from authMiddleware)
      console.log("studentId from token:", studentId);
      console.log("Querying database with studentId:", new mongoose.Types.ObjectId(studentId));
       // debugging the id
      // Fetch all booked appointments for the student
      const appointments = await Appointment.find({
        studentId:new mongoose.Types.ObjectId(studentId),
        status: 'booked',  // Only show booked appointments
      }).populate('professorId', 'name');  // Populate professor's name in the response
        console.log(appointments);
      if (!appointments || appointments.length === 0) {
        return next(new HttpError("You have no pending appointments", 404));
      }
  
      // Format the response to show the appointment details and times
      const formattedAppointments = appointments.map(appointment => ({
        professor: appointment.professorId?.name || "Professor",  // Show professor's name safely
        appointmentTime: moment.utc(appointment.time).format('MMMM Do YYYY, h:mm:ss a'),  // Format time with moment.js
        status: appointment.status,
      }));
  
      res.status(200).json({
        message: "Your upcoming appointments:",
        appointments: formattedAppointments,
      });
  
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return next(new HttpError("Failed to retrieve appointments", 500));
    }
  };

export { getAvailableSlots, bookAppointment, getStudentAppointments };