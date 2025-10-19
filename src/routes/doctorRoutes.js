const express = require("express");
const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");

const router = express.Router();

/* ================================
   🧠 CONTROLLER FUNCTIONS
================================ */

// 🩺 Add new doctor (single)
const addDoctor = async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 🩺 Add multiple doctors (bulk insert)
const addManyDoctors = async (req, res) => {
  try {
    const doctors = req.body; // expecting an array of doctor objects
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of doctors",
      });
    }

    const savedDoctors = await Doctor.insertMany(doctors);
    res.status(201).json({
      success: true,
      message: `${savedDoctors.length} doctors added successfully`,
      doctors: savedDoctors,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 📋 Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔍 Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    res.status(200).json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✏️ Update doctor
const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    res
      .status(200)
      .json({ success: true, message: "Doctor updated successfully", doctor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ❌ Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    res
      .status(200)
      .json({ success: true, message: "Doctor deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   🚀 ROUTES
================================ */

router.post("/add", addDoctor); // Add single doctor
router.post("/addMany", addManyDoctors); // ✅ Add multiple doctors
router.get("/getDoctor", getAllDoctors); // Get all doctors
router.get("/:id", getDoctorById); // Get single doctor
router.put("/:id", updateDoctor); // Update doctor
router.delete("/:id", deleteDoctor); // Delete doctor

module.exports = router;
