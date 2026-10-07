const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage()
});

// Deployed Python AI service
const AI_URL = "https://wasteflow-ai.onrender.com";

// Temporary report storage
const reports = [];

// Home
app.get("/", (req, res) => {
  res.json({
    message: "WasteFlow backend is running!",
    aiService: AI_URL
  });
});

// AI analysis
app.post("/analyze", upload.single("image"), async (req, res) => {
  console.log(
    "Received file:",
    req.file ? req.file.originalname : "NO FILE"
  );

  if (!req.file) {
    return res.status(400).json({
      error: "No image uploaded to Node backend"
    });
  }

  try {
    const formData = new FormData();

    const blob = new Blob(
      [req.file.buffer],
      {
        type: req.file.mimetype
      }
    );

    formData.append(
      "image",
      blob,
      req.file.originalname
    );

    console.log("Sending image to Python AI...");

    const response = await fetch(
      `${AI_URL}/classify`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    console.log(
      "Python AI response:",
      data
    );

    if (!response.ok) {
      return res.status(500).json({
        error: data.error || "AI analysis failed"
      });
    }

    res.json(data);

  } catch (error) {
    console.error(
      "AI connection error:",
      error
    );

    res.status(500).json({
      error: "Could not connect to WasteFlow AI"
    });
  }
});

// Submit waste report
app.post("/reports", (req, res) => {
  try {
    const {
      type,
      confidence,
      severity,
      recyclable,
      recovery,
      action,
      location
    } = req.body;

    if (!type) {
      return res.status(400).json({
        error: "Waste type is required"
      });
    }

    const report = {
      id: reports.length + 1,
      type,
      confidence,
      severity,
      recyclable,
      recovery,
      action,
      location: location || "Location not provided",
      date: new Date().toISOString()
    };

    reports.push(report);

    console.log(
      "New WasteFlow report:",
      report
    );

    res.status(201).json({
      message: "Waste report submitted successfully",
      report
    });

  } catch (error) {
    console.error(
      "Report submission error:",
      error
    );

    res.status(500).json({
      error: "Could not save waste report"
    });
  }
});

// Get all reports
app.get("/reports", (req, res) => {
  res.json({
    total: reports.length,
    reports
  });
});

// Render provides the PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `WasteFlow backend running on port ${PORT}`
  );
});
