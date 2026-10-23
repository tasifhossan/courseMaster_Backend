const assignmentService = require("../services/assignment.service");

const submitAssignment = async (req, res) => {
  try {
    const data = await assignmentService.submitAssignment(req.user.id, req.body);
    res.status(201).json(data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    res.status(statusCode).json({ message: err.message });
  }
};

const mySubmissions = async (req, res) => {
  try {
    const { courseId } = req.query;
    const data = await assignmentService.getMySubmissions(req.user.id, courseId);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getAssignmentStats = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }
    const data = await assignmentService.getAssignmentStats(req.user.id, courseId);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { submitAssignment, mySubmissions, getAssignmentStats };
