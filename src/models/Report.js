const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  familyMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    required: true, // kis member ka report hai
  },
  title: {
    type: String,
    required: [true, "Report title is required"],
    trim: true,
  },
  testName: {
    type: String,
    required: [true, "Test name is required"],
  },
  files: [
    {
      fileUrl: {
        type: String, // stored file path or Cloud URL (pdf/image)
        required: true,
      },
      fileType: {
        type: String, // pdf / image
        enum: ["pdf", "image"],
        required: true,
      },
    },
  ],
  hospitalOrLab: {
    type: String,
    required: [true, "Hospital or Lab name is required"],
  },
  doctorName: {
    type: String,
    default: "Not specified",
  },
  date: {
    type: Date,
    required: [true, "Report date is required"],
  },
  price: {
    type: Number,
    default: 0,
  },
  additionalNotes: {
    type: String,
    default: "",
  },

  /* 🩺 Health Vitals */
  bpSystolic: {
    type: Number,
    default: null,
  },
  bpDiastolic: {
    type: Number,
    default: null,
  },
  temperature: {
    type: Number, // Celsius
    default: null,
  },
  fastingSugar: {
    type: Number, // mg/dL
    default: null,
  },
  height: {
    type: Number, // cm
    default: null,
  },
  weight: {
    type: Number, // kg
    default: null,
  },

  aiAnalysis: {
    type: Object, // 👈 yahan AI ka result JSON format me store hoga
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Report", reportSchema);
