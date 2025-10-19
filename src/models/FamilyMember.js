const mongoose = require("mongoose");

const familyMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: [true, "Family member name is required"],
    trim: true,
  },
  relation: {
    type: String,
    required: [true, "Relation is required"],
    
  },
  imageUrl: {
    type: String,
    default: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png", // default avatar
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FamilyMember", familyMemberSchema);
