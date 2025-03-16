const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "subhra@123",
    database: "medicines",
});

db.connect();

const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

app.post("/extract", upload.single("image"), async (req, res) => {
    try {
        console.log("Image received:", req.file);
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const imagePath = `./uploads/${req.file.filename}`;
        console.log("Image Path:", imagePath);

        Tesseract.recognize(imagePath, "eng")
            .then(({ data: { text } }) => {
                console.log("Extracted text (Raw):", text);

                // More aggressive cleaning
                let cleanedText = text
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .replace(/\s+/g, " ")
                    .trim();

                // Remove more unwanted words
                const unwantedWords = [
                    "tablet",
                    "tablets",
                    "capsule",
                    "capsules",
                    "store",
                    "temperature",
                    "use",
                    "dosage",
                    "directed",
                    "keep",
                    "medicine",
                    "warning",
                    "protected",
                    "dry",
                    "dark",
                    "place",
                    "pharmacist",
                    "prescription",
                    "doctor",
                    "instructions",
                    "batch",
                    "expiry",
                    "date",
                    "mg",
                    "ip",
                    "lic",
                    "no",
                    "mfg",
                    "modeinindiaby",
                    "contains",
                    "uncoated",
                    "by",
                    "the",
                    "physician",
                    "atatemperature",
                    "er",
                    "dose",
                    "may",
                    "be",
                    "injurious",
                    "to",
                    "liver",
                    "siicrg",
                    "abs",
                    "limited",
                    "ha",
                    "manring",
                    "nemthang",
                    "road",
                    "dolo",
                    "davanmsatarmal",
                    "setego",
                    "ack",
                    "ais",
                    "ed",
                    "foraetaml",
                ];

                unwantedWords.forEach((word) => {
                    cleanedText = cleanedText
                        .replace(new RegExp(`\\b${word}\\b`, "gi"), "")
                        .trim();
                });

                console.log("Cleaned text:", cleanedText);

                const medicineMatch = cleanedText.match(
                    /[a-zA-Z]+\s*[a-zA-Z]*\s*\d*mg/
                );
                const medicineName = medicineMatch
                    ? medicineMatch[0]
                    : "Not Found";

                // Expiry date
                const expiryDate = "Not Found";

                console.log("Extracted Medicine Name:", medicineName);
                console.log("Extracted Expiry Date:", expiryDate);

                db.query(
                    "INSERT INTO records (medicine, expiry) VALUES (?, ?)",
                    [medicineName, expiryDate],
                    (dbErr) => {
                        if (dbErr) {
                            console.error("Database Error:", dbErr);
                            return res
                                .status(500)
                                .json({
                                    error: "Database error during insert",
                                });
                        }
                        res.json({ medicineName, expiryDate });
                        fs.unlinkSync(imagePath);
                    }
                );
            })
            .catch((tesseractErr) => {
                console.error("Tesseract Error:", tesseractErr);
                res.status(500).json({
                    error: "Tesseract OCR processing failed",
                });
                try {
                    fs.unlinkSync(imagePath);
                } catch (unlinkError) {
                    console.error(
                        "Error unlinking file after Tesseract error:",
                        unlinkError
                    );
                }
            });
    } catch (generalErr) {
        console.error("General Error:", generalErr);
        res.status(500).json({ error: "General server error" });
        try {
            fs.unlinkSync(imagePath);
        } catch (unlinkError) {
            console.error(
                "Error unlinking file after general error:",
                unlinkError
            );
        }
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
