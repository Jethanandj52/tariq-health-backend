const express = require("express");
const FamilyMember = require("../models/FamilyMember");

const router = express.Router();

/* ================================
   CONTROLLER + ROUTES COMBINED
================================ */

// ➕ Add Family Member
router.post("/add", async (req, res) => {
  try {
    const member = new FamilyMember(req.body);
    await member.save();
    res.status(201).json({ success: true, message: "Family member added", member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 📋 Get all members by user
router.get("/user/:userId", async (req, res) => {
  try {
    const members = await FamilyMember.find({ user: req.params.userId });
    res.status(200).json({ success: true, count: members.length, members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✏️ Update member
router.put("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, message: "Member updated", member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ❌ Delete member
router.delete("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// 👇 Get single member by ID
router.get("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router; // ✅ yahan "export default" nahi, "module.exports" use karo
