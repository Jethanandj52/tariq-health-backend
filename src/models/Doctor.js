const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Doctor name is required"], trim: true },
  email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true },
  phone: { type: String, required: [true, "Phone number is required"] },
  specialization: { type: String, required: [true, "Specialization is required"] },
  experience: { type: Number, required: [true, "Experience in years is required"], min: 0 },
  qualification: { type: String, required: [true, "Qualification is required"] },
  hospitalName: { type: String, required: [true, "Hospital name is required"] },
  hospitalAddress: { type: String, required: [true, "Hospital address is required"] },
  city: { type: String, required: [true, "City is required"] },
  consultationFee: { type: Number, required: [true, "Consultation fee is required"] },
  availableDays: { type: [String], default: [] },
  timings: {
    start: { type: String },
    end: { type: String },
  },
  imageUrl: {
    type: String,
    default: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png",
  },
  bio: {
    type: String,
    default: "Experienced medical professional dedicated to patient care.",
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5,
  },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      comment: String,
      rating: Number,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Doctor", doctorSchema);
