const express = require("express");
const cors = require("cors");
const pool = require("./db");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");

const app = express();

// ============================================
// EMAIL OTP CONFIGURATION
// ============================================
const SMTP_EMAIL = process.env.SMTP_EMAIL || "idealab2026emm@gmail.com";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "nsncqufnpwtxmwvm";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASSWORD,
  },
});

// In-memory OTP store: email -> { otp, expiry }
const otpStore = new Map();

// In-memory verified emails store: email -> { verifiedAt }
// Emails here have been verified via OTP and can proceed to signup
const verifiedEmails = new Map();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Serve static files from the React frontend app (or plain HTML/CSS/JS in parent dir)
const path = require("path");
app.use(express.static(path.join(__dirname, "../")));

// Debug logging to see what paths are requested
app.use((req, res, next) => {
  console.log(`DEBUG: Request for ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  console.log("Serving root /, redirecting to /html/login.html");
  res.redirect("/html/login.html");
});

// Handle GET /login explicitly (redirect to root)
app.get("/login", (req, res) => {
  res.redirect("/");
});

// ============================================
// DATABASE CONNECTION & AUTO-MIGRATION
// ============================================

const PORT = process.env.PORT || 5000;

// Auto-create tables if they don't exist
const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    mail VARCHAR(100) UNIQUE NOT NULL,
    rollno VARCHAR(20) NOT NULL,
    department VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    material_code VARCHAR(50) UNIQUE NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    material_type VARCHAR(50) DEFAULT 'General',
    description TEXT,
    location VARCHAR(100),
    image_url TEXT,
    total_qty INTEGER DEFAULT 0,
    available_qty INTEGER DEFAULT 0,
    amount_with_gst DECIMAL(10, 2) DEFAULT 0.00,
    supplier_address TEXT,
    bill_no_invoice VARCHAR(100),
    balance INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL, 
    quantity INTEGER DEFAULT 1,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lab_inventory (
      id SERIAL PRIMARY KEY,
      component_name VARCHAR(255) NOT NULL,
      specification TEXT,
      quantity INT NOT NULL DEFAULT 0,
      original_quantity INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Initialize Database
pool.connect().then(client => {
  return client
    .query(createTablesQuery)
    .then(() => {
      client.release();
      console.log("✅ Database tables verified/created successfully");
    })
    .catch(err => {
      client.release();
      console.error("❌ Error creating tables:", err);
    });
});


// ============================================
// HEALTH CHECK
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "✓ Server online", timestamp: new Date() });
});

app.get("/test", (req, res) => {
  res.json({ message: "✓ Server running" });
});

// ============================================
// LOGIN - WORKS WITH USERNAME AND MAIL ✅
// Uses 'mail' column (not 'email')
// ============================================
app.post("/login", async (req, res) => {
  try {
    // Accept both username and mail (email address in mail column)
    const { username, mail, password } = req.body;

    // If frontend sends 'email', accept it and treat as 'mail'
    const emailOrMail = mail || req.body.email;

    // Require either username or mail/email
    if (!username && !emailOrMail) {
      console.log("❌ No credentials provided");
      return res.status(400).json({ message: "Username or email required" });
    }

    if (!password) {
      console.log("❌ No password provided");
      return res.status(400).json({ message: "Password required" });
    }

    console.log(`🔐 Login attempt - Username: ${username}, Mail/Email: ${emailOrMail}`);

    let userQuery;

    // Search by MAIL column (email address) if provided
    if (emailOrMail) {
      console.log(`📧 Searching by mail column: ${emailOrMail}`);
      userQuery = await pool.query(
        "SELECT * FROM users WHERE mail=$1 AND password=$2",
        [emailOrMail, password]
      );
    }
    // Search by USERNAME if provided
    else if (username) {
      console.log(`👤 Searching by username: ${username}`);
      userQuery = await pool.query(
        "SELECT * FROM users WHERE username=$1 AND password=$2",
        [username, password]
      );
    }

    // Check if user found
    if (userQuery.rows.length === 0) {
      console.log("❌ Invalid username/email or password");
      return res.status(401).json({ message: "Invalid login" });
    }

    const user = userQuery.rows[0];
    console.log(`✅ Login successful for: ${user.username}`);
    res.json(user);
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// REGISTER
// ============================================
app.post("/register", async (req, res) => {
  try {
    const { username, password, fullname, mail, rollno, department } = req.body;

    if (!username || !password || !fullname || !mail || !rollno || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const result = await pool.query(
      "INSERT INTO users (username, password, fullname, mail, rollno, department) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, fullname, mail, rollno, department",
      [username, password, fullname, mail, rollno, department]
    );

    res.status(200).json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration error: " + err.message });
  }
});

// ============================================
// SEND OTP - EMAIL VERIFICATION FOR SIGNUP
// Only requires email (college mail @rathinam.in)
// ============================================
app.post("/api/send-otp", async (req, res) => {
  console.log("\n========== POST /api/send-otp ==========");
  try {
    const { email } = req.body;

    console.log(`📧 OTP request for: ${email}`);

    // Validate email
    if (!email) {
      console.log("❌ Email is required");
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email domain (@rathinam.in college mail)
    const emailRegex = /^[a-zA-Z0-9._-]+@rathinam\.in$/;
    if (!emailRegex.test(email)) {
      console.log(`❌ Invalid email domain: ${email}`);
      return res.status(400).json({ error: "Email must be a valid @rathinam.in college mail address" });
    }

    // Check if email already registered
    const existingEmail = await pool.query("SELECT * FROM users WHERE mail=$1", [email]);
    if (existingEmail.rows.length > 0) {
      console.log(`❌ Email already exists: ${email}`);
      return res.status(400).json({ error: "This college email is already registered" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP (email only, no user data needed)
    otpStore.set(email, { otp, expiry });

    console.log(`🔑 OTP generated for ${email}: ${otp}`);

    // Send OTP via email
    const mailOptions = {
      from: `"R-FAB X-STUDIO" <${SMTP_EMAIL}>`,
      to: email,
      subject: "🔐 Email Verification OTP - R-FAB X-STUDIO",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
          <div style="background: white; border-radius: 12px; padding: 40px; text-align: center;">
            <h2 style="color: #1f2937; margin-bottom: 10px;">Email Verification</h2>
            <p style="color: #6b7280; margin-bottom: 30px;">Use this OTP to verify your college email for R-FAB X-STUDIO</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0066ff;">${otp}</span>
            </div>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">This OTP is valid for <strong>5 minutes</strong>.</p>
            <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">© 2026 R-FAB X-STUDIO Lab Management System</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);

    res.status(200).json({ message: "OTP sent to your college email address" });

  } catch (err) {
    console.error("❌ Send OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// ============================================
// VERIFY OTP - MARKS EMAIL AS VERIFIED
// Does NOT create account (that happens in /api/signup)
// ============================================
app.post("/api/verify-otp", async (req, res) => {
  console.log("\n========== POST /api/verify-otp ==========");
  try {
    const { email, otp } = req.body;

    console.log(`🔍 Verifying OTP for: ${email}`);

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    // Check if OTP exists
    const stored = otpStore.get(email);
    if (!stored) {
      console.log(`❌ No OTP found for: ${email}`);
      return res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
    }

    // Check expiry
    if (Date.now() > stored.expiry) {
      console.log(`❌ OTP expired for: ${email}`);
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (stored.otp !== otp.trim()) {
      console.log(`❌ Invalid OTP for: ${email}`);
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    console.log(`✅ OTP verified for: ${email}`);

    // Clear OTP from store
    otpStore.delete(email);

    // Mark email as verified (valid for 15 minutes to complete signup)
    verifiedEmails.set(email, { verifiedAt: Date.now() });

    res.status(200).json({
      message: "Email verified successfully! Please complete your registration.",
      verified: true,
      email: email
    });

  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    res.status(500).json({ error: "Server error during verification" });
  }
});

// ============================================
// SIGNUP API - REQUIRES VERIFIED EMAIL
// Email must be verified via OTP before calling this
// ============================================
app.post("/api/signup", async (req, res) => {
  console.log("\n========== POST /api/signup ==========");
  try {
    const { username, password, fullname, email, rollno, department } = req.body;

    console.log(`📝 Signup attempt:`, { username, email, rollno, department });

    // Validate all required fields
    if (!username || !password || !fullname || !email || !rollno || !department) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if email was verified via OTP
    const verified = verifiedEmails.get(email);
    if (!verified) {
      console.log(`❌ Email not verified: ${email}`);
      return res.status(400).json({ error: "Email not verified. Please verify your college email first." });
    }

    // Check if verification is still valid (15 min window)
    if (Date.now() - verified.verifiedAt > 15 * 60 * 1000) {
      console.log(`❌ Email verification expired for: ${email}`);
      verifiedEmails.delete(email);
      return res.status(400).json({ error: "Email verification expired. Please verify again." });
    }

    console.log("✓ Email verified via OTP");

    // Check if username already exists
    const existingUsername = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    if (existingUsername.rows.length > 0) {
      console.log(`❌ Username already exists: ${username}`);
      return res.status(400).json({ error: "Username already exists" });
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      "SELECT * FROM users WHERE mail=$1",
      [email]
    );

    if (existingEmail.rows.length > 0) {
      console.log(`❌ Email already exists: ${email}`);
      return res.status(400).json({ error: "Email already registered" });
    }

    console.log("✓ Username and email available");

    // Insert new user (using 'mail' column to match existing schema)
    const result = await pool.query(
      "INSERT INTO users (username, password, fullname, mail, rollno, department) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, fullname, mail, rollno, department",
      [username, password, fullname, email, rollno, department]
    );

    // Clear verified email
    verifiedEmails.delete(email);

    console.log(`✅ User created successfully: ${username}`);
    res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// ============================================
// VERIFY EMAIL API (FOR FORGOT PASSWORD)
// ============================================
app.post("/api/verify-email", async (req, res) => {
  console.log("\n========== POST /api/verify-email ==========");
  try {
    const { email } = req.body;

    console.log(`📧 Email verification attempt: ${email}`);

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if email exists in database (using 'mail' column)
    const result = await pool.query(
      "SELECT id, username, mail FROM users WHERE mail=$1",
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Email not found: ${email}`);
      return res.status(404).json({ error: "Email not found in our records" });
    }

    console.log(`✅ Email verified: ${email}`);
    res.json({
      message: "Email verified successfully",
      email: result.rows[0].mail
    });
  } catch (err) {
    console.error("❌ Email verification error:", err);
    res.status(500).json({ error: "Server error during email verification" });
  }
});

// ============================================
// RESET PASSWORD API
// ============================================
app.post("/api/reset-password", async (req, res) => {
  console.log("\n========== POST /api/reset-password ==========");
  try {
    const { email, newPassword } = req.body;

    console.log(`🔑 Password reset attempt for: ${email}`);

    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user exists (using 'mail' column)
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE mail=$1",
      [email]
    );

    if (userCheck.rows.length === 0) {
      console.log(`❌ Email not found: ${email}`);
      return res.status(404).json({ error: "Email not found" });
    }

    // Update password
    await pool.query(
      "UPDATE users SET password=$1 WHERE mail=$2",
      [newPassword, email]
    );

    console.log(`✅ Password reset successful for: ${email}`);
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("❌ Password reset error:", err);
    res.status(500).json({ error: "Server error during password reset" });
  }
});


// ============================================
// UPLOAD USERS (BULK REGISTRATION)
// ============================================
app.post("/upload-users", async (req, res) => {
  console.log("\n========== POST /upload-users ==========");

  try {
    const { users } = req.body;

    // Validation
    if (!users) {
      console.log("❌ No users provided");
      return res.status(400).json({ message: "No users provided" });
    }

    if (!Array.isArray(users)) {
      console.log("❌ Users is not an array");
      return res.status(400).json({ message: "Users must be an array" });
    }

    if (users.length === 0) {
      console.log("❌ Users array is empty");
      return res.status(400).json({ message: "Users array is empty" });
    }

    console.log(`📥 Processing ${users.length} users...`);

    let uploadedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Process each user
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      const rowNum = index + 1; // Row number for error messages

      console.log(`\n📝 Processing user ${rowNum}:`, {
        username: user.username,
        mail: user.mail,
        fullname: user.full_name,
        rollno: user.roll_no,
        department: user.department,
        role: user.role
      });

      try {
        // Validate required fields
        if (!user.username || !user.password) {
          const error = `Row ${rowNum}: Missing required fields (username or password)`;
          console.warn(`⚠️ ${error}`);
          errors.push(error);
          failedCount++;
          continue;
        }

        const username = String(user.username).trim();
        const password = String(user.password).trim();
        const mail = user.mail ? String(user.mail).trim() : '';
        const fullname = user.full_name ? String(user.full_name).trim() : '';
        const rollno = user.roll_no ? String(user.roll_no).trim() : '';
        const department = user.department ? String(user.department).trim() : '';

        console.log(`  Username: ${username}`);
        console.log(`  Mail: ${mail}`);
        console.log(`  Full Name: ${fullname}`);
        console.log(`  Roll No: ${rollno}`);
        console.log(`  Department: ${department}`);

        // Check if user already exists
        const existing = await pool.query(
          "SELECT * FROM users WHERE username=$1",
          [username]
        );

        if (existing.rows.length > 0) {
          const error = `Row ${rowNum}: Username already exists: ${username}`;
          console.warn(`⚠️ ${error}`);
          errors.push(error);
          failedCount++;
          continue;
        }

        // INSERT new user
        console.log(`  ✨ Creating new user...`);
        await pool.query(
          "INSERT INTO users (username, password, fullname, mail, rollno, department) VALUES ($1,$2,$3,$4,$5,$6)",
          [username, password, fullname, mail, rollno, department]
        );

        uploadedCount++;
        console.log(`  ✅ User created successfully`);

      } catch (error) {
        failedCount++;
        const errorMsg = `Row ${rowNum}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const summary = `Created: ${uploadedCount}, Failed: ${failedCount}`;

    console.log("\n========== Upload Summary ==========");
    console.log(`✅ Total Success: ${uploadedCount}/${users.length}`);
    console.log(summary);

    if (errors.length > 0) {
      console.log(`⚠️ Errors encountered:`);
      errors.forEach(err => console.log(`   - ${err}`));
    }

    // Return response based on success/failure
    if (uploadedCount === 0) {
      return res.status(400).json({
        message: "No users were uploaded",
        summary: summary,
        errors: errors
      });
    }

    res.status(200).json({
      message: `${uploadedCount} user(s) uploaded successfully (${summary})`,
      created: uploadedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({
      message: "Upload processing error",
      error: err.message
    });
  }
});

// ============================================
// LAB INVENTORY ENDPOINTS (Stock Book) ✅ ONLY ADDED THIS SECTION
// ============================================

// GET all lab_inventory records (Redirecting to materials as lab_inventory table doesn't exist)
app.get("/lab-inventory", async (req, res) => {
  console.log("📚 GET /lab-inventory (fetching from materials)");
  try {
    const result = await pool.query("SELECT * FROM materials ORDER BY id ASC");
    console.log(`✓ Found ${result.rows.length} records`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: "Error fetching inventory: " + err.message });
  }
});

// UPDATE lab_inventory record
app.put("/lab-inventory/:id", async (req, res) => {
  console.log("\n========== PUT /lab-inventory/:id ==========");
  try {
    const { id } = req.params;
    const {
      material_code,
      material_name,
      material_type,
      supplier_address,
      bill_no_invoice,
      opening_balance,
      quantity_received,
      quantity_issued,
      balance,
      amount_with_gst,
      available_qty
    } = req.body;

    console.log(`📝 Updating record ID: ${id}`);
    console.log(`  Code: ${material_code}`);
    console.log(`  Name: ${material_name}`);
    console.log(`  Amount with GST: ${amount_with_gst}`);
    console.log(`  Available Qty: ${available_qty}`);

    // Validate
    if (!material_code || !material_name) {
      console.log("❌ Validation failed");
      return res.status(400).json({ message: "Material Code and Name are required" });
    }

    // Check if exists
    const check = await pool.query("SELECT id FROM materials WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      console.log("❌ Record not found");
      return res.status(404).json({ message: "Record not found" });
    }

    // Update with EXACT column names from materials table
    const result = await pool.query(
      `UPDATE materials 
       SET material_code = $1, 
           material_name = $2, 
           material_type = $3, 
           supplier_address = $4, 
           bill_no_invoice = $5, 
           opening_balance = $6, 
           quantity_received = $7, 
           quantity_issued = $8, 
           balance = $9,
           amount_with_gst = $10,
           available_quantity = $11
       WHERE id = $12
       RETURNING *`,
      [
        material_code,
        material_name,
        material_type || null,
        supplier_address || null,
        bill_no_invoice || null,
        parseInt(opening_balance) || 0,
        parseInt(quantity_received) || 0,
        parseInt(quantity_issued) || 0,
        parseInt(balance) || 0,
        parseFloat(amount_with_gst) || 0,
        parseInt(available_qty) || 0,
        id
      ]
    );

    console.log(`✅ Record updated successfully!`);
    res.json({
      message: 'Record updated successfully',
      record: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: "Error updating record: " + err.message });
  }
});

// DELETE lab_inventory record
app.delete("/lab-inventory/:id", async (req, res) => {
  console.log("\n========== DELETE /lab-inventory/:id ==========");
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting record ID: ${id}`);

    // Check if exists
    const check = await pool.query("SELECT material_code FROM materials WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      console.log("❌ Record not found");
      return res.status(404).json({ message: "Record not found" });
    }

    const materialCode = check.rows[0].material_code;

    // Delete
    await pool.query("DELETE FROM materials WHERE id = $1", [id]);

    console.log(`✅ Record deleted: ${materialCode}`);
    res.json({ message: "Record deleted successfully", material_code: materialCode });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: "Error deleting record: " + err.message });
  }
});

// ============================================
// MATERIALS
// ============================================
app.get("/materials", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM materials ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching materials" });
  }
});

// ============================================
// GET MATERIAL BY CODE OR ID
// ============================================
app.get("/materials/:code", async (req, res) => {
  try {
    const { code } = req.params;
    let result;

    // Try exact match on material_code
    result = await pool.query(
      "SELECT * FROM materials WHERE material_code=$1",
      [code]
    );

    // If not found and code is numeric, try as ID
    if (result.rows.length === 0 && !isNaN(code)) {
      result = await pool.query(
        "SELECT * FROM materials WHERE id=$1",
        [parseInt(code)]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error fetching material" });
  }
});


app.get("/materials/search", async (req, res) => {
  try {
    const q = req.query.q;
    // Search by material_name or material_code
    const result = await pool.query(
      "SELECT * FROM materials WHERE material_name ILIKE $1 OR material_code ILIKE $1 LIMIT 10",
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error searching materials" });
  }
});

// ============================================
// UPDATE MATERIAL (PUT) - FOR STOCK BOOK
// ============================================
app.put("/materials/:id", async (req, res) => {
  console.log("\n========== PUT /materials/:id ==========");

  try {
    const { id } = req.params;
    const {
      material_code,
      material_name,
      material_type,
      supplier_address,
      bill_no_invoice,
      opening_balance,
      quantity_received,
      quantity_issued,
      balance,
      available_qty,
      amount_with_gst
    } = req.body;

    console.log(`📝 Updating material ID: ${id}`);
    console.log(`  Code: ${material_code}`);
    console.log(`  Name: ${material_name}`);
    console.log(`  Type: ${material_type}`);
    console.log(`  Supplier: ${supplier_address}`);
    console.log(`  Bill No: ${bill_no_invoice}`);
    console.log(`  Opening Balance: ${opening_balance}`);
    console.log(`  Qty Received: ${quantity_received}`);
    console.log(`  Qty Issued: ${quantity_issued}`);
    console.log(`  Balance: ${balance}`);
    console.log(`  Amount with GST: ${amount_with_gst}`);
    console.log(`  Available Qty: ${available_qty}`);

    // Validate required fields
    if (!material_code || !material_name) {
      console.log("❌ Validation failed: Material Code and Name are required");
      return res.status(400).json({
        message: 'Material Code and Name are required'
      });
    }

    // Check if material exists
    const checkQuery = 'SELECT * FROM materials WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      console.log(`❌ Material not found: ${id}`);
      return res.status(404).json({
        message: 'Material not found'
      });
    }

    console.log("✓ Material exists, proceeding with update");

    // Update material with correct column names
    const updateQuery = `
      UPDATE materials 
      SET 
        material_code = $1,
        material_name = $2,
        material_type = $3,
        supplier_address = $4,
        bill_no_invoice = $5,
        opening_balance = $6,
        quantity_received = $7,
        quantity_issued = $8,
        balance = $9,
        available_quantity = $10,
        amount_with_gst = $11
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      material_code,
      material_name,
      material_type || null,
      supplier_address || null,
      bill_no_invoice || null,
      parseInt(opening_balance) || 0,
      parseInt(quantity_received) || 0,
      parseInt(quantity_issued) || 0,
      parseInt(balance) || 0,
      parseInt(available_qty) || 0,
      parseFloat(amount_with_gst) || 0,
      id
    ];

    console.log("⚙️ Executing update query...");
    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      console.log("❌ Update returned no rows");
      return res.status(400).json({
        message: 'Failed to update material'
      });
    }

    const updatedMaterial = result.rows[0];
    console.log('✅ Material updated successfully!');
    console.log(`  ID: ${updatedMaterial.id}`);
    console.log(`  Code: ${updatedMaterial.material_code}`);
    console.log(`  Name: ${updatedMaterial.material_name}`);

    res.json({
      message: 'Material updated successfully',
      id: updatedMaterial.id,
      material_code: updatedMaterial.material_code,
      material_name: updatedMaterial.material_name,
      available_quantity: updatedMaterial.available_quantity
    });

  } catch (error) {
    console.error('❌ Update error:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({
      message: 'Server error: ' + error.message
    });
  }
});

// ============================================
// DELETE MATERIAL (DELETE) - FOR STOCK BOOK
// ============================================
app.delete("/materials/:id", async (req, res) => {
  console.log("\n========== DELETE /materials/:id ==========");

  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting material ID: ${id}`);

    // Check if material exists
    const checkQuery = 'SELECT material_code FROM materials WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      console.log(`❌ Material not found: ${id}`);
      return res.status(404).json({
        message: 'Material not found'
      });
    }

    const materialCode = checkResult.rows[0].material_code;
    console.log(`✓ Material found: ${materialCode}`);

    // Delete material
    const deleteQuery = 'DELETE FROM materials WHERE id = $1 RETURNING id';
    console.log("⚙️ Executing delete query...");
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      console.log("❌ Delete returned no rows");
      return res.status(400).json({
        message: 'Failed to delete material'
      });
    }

    console.log(`✅ Material deleted successfully!`);
    console.log(`  Code: ${materialCode}`);
    console.log(`  ID: ${id}`);

    res.json({
      message: 'Material deleted successfully',
      material_code: materialCode,
      id: id
    });

  } catch (error) {
    console.error('❌ Delete error:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({
      message: 'Server error: ' + error.message
    });
  }
});

// ============================================
// UPLOAD MATERIALS - FIXED
// ============================================
app.post("/upload-materials", async (req, res) => {
  console.log("\n========== POST /upload-materials (FIXED) ==========");

  try {
    const { materials } = req.body;

    // Validation
    if (!materials) {
      console.log("❌ No materials provided");
      return res.status(400).json({ message: "No materials provided" });
    }

    if (!Array.isArray(materials)) {
      console.log("❌ Materials is not an array");
      return res.status(400).json({ message: "Materials must be an array" });
    }

    if (materials.length === 0) {
      console.log("❌ Materials array is empty");
      return res.status(400).json({ message: "Materials array is empty" });
    }

    console.log(`📥 Processing ${materials.length} materials...`);

    let uploadedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Process each material
    for (let index = 0; index < materials.length; index++) {
      const material = materials[index];
      const rowNum = index + 2; // Row number in Excel (starting from row 2)

      try {
        // Validate required fields
        if (!material.material_code || !material.material_name) {
          const error = `Row ${rowNum}: Missing required fields (material_code or material_name)`;
          errors.push(error);
          failedCount++;
          continue;
        }

        const materialCode = String(material.material_code).trim();
        const materialName = String(material.material_name).trim();
        const materialType = material.material_type ? String(material.material_type).trim() : "General";

        // Use balance and available_quantity (default to 0 if missing)
        const balance = material.balance ? parseInt(material.balance) : 0;
        const availableQty = material.available_quantity ? parseInt(material.available_quantity) : 0;

        // Check if material already exists
        const existing = await pool.query(
          "SELECT * FROM materials WHERE material_code=$1",
          [materialCode]
        );

        if (existing.rows.length > 0) {
          // UPDATE existing material
          // Only updating name as per previous instruction to not zero out invalid columns
          await pool.query(
            "UPDATE materials SET material_name=$1 WHERE material_code=$2",
            [materialName, materialCode]
          );
          updatedCount++;
        } else {
          // CREATE new material
          await pool.query(
            "INSERT INTO materials (material_name, material_code, balance, available_quantity, opening_balance, material_type) VALUES ($1,$2,$3,$4,$5,$6)",
            [materialName, materialCode, balance, availableQty, balance, materialType]
          );
          uploadedCount++;
        }
      } catch (error) {
        failedCount++;
        const errorMsg = `Row ${rowNum}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const totalSuccess = uploadedCount + updatedCount;
    const summary = `Created: ${uploadedCount}, Updated: ${updatedCount}, Failed: ${failedCount}`;

    console.log("\n========== Upload Summary ==========");
    console.log(`✅ Total Success: ${totalSuccess}/${materials.length}`);
    console.log(summary);

    if (totalSuccess === 0) {
      return res.status(400).json({
        message: "No materials were uploaded",
        summary: summary,
        errors: errors
      });
    }

    res.status(200).json({
      message: `${totalSuccess} material(s) processed successfully`,
      summary: summary,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({
      message: "Upload processing error",
      error: err.message
    });
  }
});

// ============================================
// TRANSACTIONS
// ============================================
app.get("/transactions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM transactions ORDER BY scan_time DESC LIMIT 1000");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
});

// ============================================
// GET USER'S BORROWED QUANTITY FOR A MATERIAL
// New endpoint for per-user return validation
// ============================================
app.get("/api/user-borrowed-quantity", async (req, res) => {
  console.log("\n========== GET /api/user-borrowed-quantity ==========");
  try {
    const { username, material_code } = req.query;

    console.log(`📊 Checking borrowed quantity for user: ${username}, material: ${material_code}`);

    if (!username || !material_code) {
      return res.status(400).json({ error: "Username and material_code are required" });
    }

    // Calculate borrowed vs returned quantities for this specific user and material
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN action='checkout' THEN quantity ELSE 0 END), 0) as total_borrowed,
        COALESCE(SUM(CASE WHEN action='checkin' THEN quantity ELSE 0 END), 0) as total_returned
       FROM transactions
       WHERE username=$1 AND item_code=$2`,
      [username, material_code]
    );

    const totalBorrowed = parseInt(result.rows[0]?.total_borrowed || 0);
    const totalReturned = parseInt(result.rows[0]?.total_returned || 0);
    const outstanding = totalBorrowed - totalReturned;

    console.log(`📊 Results:`);
    console.log(`  Total borrowed: ${totalBorrowed}`);
    console.log(`  Total returned: ${totalReturned}`);
    console.log(`  Outstanding: ${outstanding}`);

    res.json({
      borrowed: totalBorrowed,
      returned: totalReturned,
      outstanding: outstanding
    });

  } catch (err) {
    console.error("❌ Error calculating borrowed quantity:", err);
    res.status(500).json({ error: "Server error checking borrowed quantity" });
  }
});


app.post("/checkout", async (req, res) => {
  try {
    const { username, material_code, quantity } = req.body;
    const qty = quantity || 1;

    // Use material_code from request (frontend sends this) but query material_code column
    const mat = await pool.query("SELECT * FROM materials WHERE material_code=$1", [material_code]);

    if (mat.rows.length === 0) {
      return res.status(404).json({ message: "Material not found" });
    }

    const material = mat.rows[0];

    // Use available_quantity from DB
    if (material.available_quantity < qty) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }

    await pool.query(
      "UPDATE materials SET available_quantity = available_quantity - $1 WHERE material_code=$2",
      [qty, material_code]
    );

    await pool.query(
      "INSERT INTO transactions (username, item_code, item_name, action, quantity) VALUES ($1,$2,$3,$4,$5)",
      [username, material_code, material.material_name, "checkout", qty]
    );

    res.json({ message: "Checkout successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Checkout error: " + err.message });
  }
});

app.post("/checkin", async (req, res) => {
  try {
    const { username, material_code, quantity } = req.body;
    const qty = quantity || 1;

    const mat = await pool.query("SELECT * FROM materials WHERE material_code=$1", [material_code]);

    if (mat.rows.length === 0) {
      return res.status(404).json({ message: "Material not found" });
    }

    const material = mat.rows[0];

    // Use available_quantity from DB
    // Logic: If available + new > max? User schema has 'balance', 'available_quantity', 'opening_balance'. 
    // Assuming we just increment available_quantity.

    // if (material.available_quantity + qty > material.total_qty) ... total_qty column missing in actual DB. 
    // skipping total_qty check or using opening_balance?
    // Let's just increment available_quantity without upper bound check for now, or check opening_balance if that represents total.

    // if (material.available_quantity + qty > material.opening_balance) { 
    //   return res.status(400).json({ message: "Cannot exceed total stock limit" });
    // }

    await pool.query(
      "UPDATE materials SET available_quantity = available_quantity + $1 WHERE material_code=$2",
      [qty, material_code]
    );

    await pool.query(
      "INSERT INTO transactions (username, item_code, item_name, action, quantity) VALUES ($1,$2,$3,$4,$5)",
      [username, material_code, material.material_name, "checkin", qty]
    );

    res.json({ message: "Checkin successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Checkin error: " + err.message });
  }
});

// ============================================
// GET ALL TRANSACTIONS
// ============================================
app.get("/transactions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM transactions ORDER BY scan_time DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching transactions:", err);
    res.status(500).json({ message: "Error fetching transactions" });
  }
});

// ============================================
// PROFILE
// ============================================
app.get("/profile/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Profile error" });
  }
});

app.put("/profile/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const { fullname } = req.body;

    await pool.query(
      "UPDATE users SET fullname=$1 WHERE username=$2",
      [fullname, username]
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update error" });
  }
});

// ============================================
// DIAGNOSTIC ENDPOINTS
// ============================================

// Test database connection
app.get("/test-db", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const result = await pool.query("SELECT NOW() as current_time");
    console.log("✅ Database connection test successful");
    return res.status(200).json({
      status: "Database connected",
      time: result.rows[0].current_time
    });
  } catch (err) {
    console.error("❌ Database connection test failed:", err.message);
    return res.status(500).json({
      status: "Database connection failed",
      error: err.message
    });
  }
});

// Test user table
app.get("/test-users-table", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM users");
    const count = result.rows[0].count;
    console.log(`✅ Users table test successful - ${count} users found`);
    return res.status(200).json({
      status: "Users table exists",
      user_count: count
    });
  } catch (err) {
    console.error("❌ Users table test failed:", err.message);
    return res.status(500).json({
      status: "Users table error",
      error: err.message
    });
  }
});

// Test transactions table
app.get("/test-transactions", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM transactions");
    const count = result.rows[0].count;
    res.json({
      status: "Transactions table accessible",
      count: count
    });
  } catch (err) {
    res.status(500).json({
      status: "Transactions table error",
      error: err.message
    });
  }
});

// ============================================
// ADMIN - MANAGE USERS (FIXED VERSION)
// ============================================

// Get all users (excluding admin accounts)
app.get("/users", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    console.log("📨 GET /users endpoint called");

    const result = await pool.query(
      "SELECT id, username, fullname, mail, rollno, department, password, role FROM users WHERE username NOT IN ('admin', 'admin1', 'admin2') ORDER BY username ASC"
    );

    console.log(`✓ Found ${result.rows.length} users`);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error in GET /users:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({ message: "Error fetching users: " + err.message });
  }
});

// ============================================
// UPDATE USER (FIXED - PASSWORD OPTIONAL)
// ============================================
app.put("/admin/users/:oldUsername", async (req, res) => {
  console.log("\n========== PUT /admin/users/:oldUsername ==========");
  console.log("Old username (from URL):", req.params.oldUsername);
  console.log("Request body:", req.body);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const oldUsername = req.params.oldUsername;
  const { username: newUsername, password, fullname, mail, rollno, department } = req.body;

  try {
    // Validate required fields
    if (!fullname || !mail || !rollno || !department) {
      console.log("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        message: "Required fields: fullname, mail, rollno, department"
      });
    }

    console.log("✓ Validation passed");
    console.log(`📝 Updating user: ${oldUsername}`);
    console.log(`  New username: ${newUsername || oldUsername}`);
    console.log(`  Password included: ${!!password && password.trim().length > 0}`);

    // Check if user exists
    console.log("🔍 Checking if user exists...");
    const checkUser = await pool.query(
      "SELECT id, username FROM users WHERE username = $1",
      [oldUsername]
    );

    if (checkUser.rows.length === 0) {
      console.log("❌ User not found:", oldUsername);
      return res.status(404).json({ message: "User not found: " + oldUsername });
    }

    console.log("✓ User exists");

    // If username is being changed, check if new username is available
    const finalUsername = newUsername && newUsername.trim() ? newUsername.trim() : oldUsername;

    if (finalUsername !== oldUsername) {
      console.log(`🔄 Username change detected: ${oldUsername} → ${finalUsername}`);

      const checkNewUsername = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND username != $2",
        [finalUsername, oldUsername]
      );

      if (checkNewUsername.rows.length > 0) {
        console.log("❌ New username already exists:", finalUsername);
        return res.status(400).json({ message: "Username already exists: " + finalUsername });
      }
      console.log("✓ New username is available");
    }

    // Prepare update query
    let updateQuery;
    let queryParams;

    // If password is provided and not empty, include it in update
    if (password && password.trim().length > 0) {
      console.log("🔐 Updating with new password");
      updateQuery = `
        UPDATE users 
        SET username = $1, password = $2, fullname = $3, mail = $4, rollno = $5, department = $6
        WHERE username = $7
        RETURNING id, username, fullname, mail, rollno, department, password
      `;
      queryParams = [finalUsername, password, fullname, mail, rollno, department, oldUsername];
    } else {
      // Update WITHOUT password (keep existing password)
      console.log("📝 Updating without password (keeping existing)");
      updateQuery = `
        UPDATE users 
        SET username = $1, fullname = $2, mail = $3, rollno = $4, department = $5
        WHERE username = $6
        RETURNING id, username, fullname, mail, rollno, department, password
      `;
      queryParams = [finalUsername, fullname, mail, rollno, department, oldUsername];
    }

    console.log("⚙️ Executing update query...");
    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      console.log("❌ Update returned no rows");
      return res.status(500).json({ message: "Update failed - no rows returned" });
    }

    const updatedUser = result.rows[0];
    console.log("✅ User updated successfully!");
    console.log("Updated user data:");
    console.log(`  - Username: ${updatedUser.username}`);
    console.log(`  - Full Name: ${updatedUser.fullname}`);
    console.log(`  - Email: ${updatedUser.mail}`);
    console.log(`  - Roll No: ${updatedUser.rollno}`);
    console.log(`  - Department: ${updatedUser.department}`);

    return res.status(200).json({
      message: "User updated successfully",
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        mail: updatedUser.mail,
        rollno: updatedUser.rollno,
        department: updatedUser.department,
        password: updatedUser.password
      }
    });

  } catch (error) {
    console.error("❌ ERROR in PUT /admin/users/:oldUsername");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", error);

    return res.status(500).json({
      message: "Server error: " + error.message,
      error: error.message,
      success: false
    });
  }
});

// Delete user (admin only)
app.delete("/admin/users/:username", async (req, res) => {
  try {
    const { username } = req.params;

    console.log("🗑️ Admin deleting user:", username);

    const result = await pool.query("DELETE FROM users WHERE username=$1 RETURNING username", [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✓ User deleted:", username);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Admin delete error:", err);
    res.status(500).json({ message: "Delete error: " + err.message });
  }
});

// ============================================
// EXPORT EXCEL
// ============================================
app.get("/export", async (req, res) => {
  try {
    const materials = await pool.query("SELECT * FROM materials ORDER BY id ASC");
    const transactions = await pool.query("SELECT * FROM transactions ORDER BY scan_time DESC LIMIT 1000");

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Materials
    const sheet1 = workbook.addWorksheet("Materials");
    sheet1.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Material Name", key: "material_name", width: 30 },
      { header: "Material Code", key: "material_code", width: 20 },
      { header: "Total Qty", key: "opening_balance", width: 15 },
      { header: "Available Qty", key: "available_quantity", width: 15 }
    ];

    materials.rows.forEach((row) => sheet1.addRow(row));

    // Sheet 2: All Transactions
    const sheet2 = workbook.addWorksheet("All Transactions");
    sheet2.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Username", key: "username", width: 20 },
      { header: "Material Code", key: "material_code", width: 20 },
      { header: "Material Name", key: "material_name", width: 30 },
      { header: "Action", key: "action", width: 15 },
      { header: "Time", key: "scan_time", width: 25 }
    ];

    transactions.rows.forEach((row) => sheet2.addRow(row));

    // Sheet 3: Monthly Backup
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyTrans = transactions.rows.filter((t) =>
      new Date(t.scan_time) >= thirtyDaysAgo
    );

    const sheet3 = workbook.addWorksheet("Monthly Backup");
    sheet3.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Username", key: "username", width: 20 },
      { header: "Material Code", key: "material_code", width: 20 },
      { header: "Material Name", key: "material_name", width: 30 },
      { header: "Action", key: "action", width: 15 },
      { header: "Time", key: "scan_time", width: 25 }
    ];

    monthlyTrans.forEach((row) => sheet3.addRow(row));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const filename = `Admin_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export error" });
  }
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  console.log("❌ 404 - Route not found:", req.path);
  res.setHeader("Content-Type", "application/json");
  res.status(404).json({ message: "Route not found" });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.setHeader("Content-Type", "application/json");
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// ============================================
// AUTO-MIGRATION: Ensure all required columns exist
// ============================================
async function runMigrations() {
  try {
    console.log("🔧 Running auto-migrations...");

    // Check and add role column to users table if missing
    const roleCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    if (roleCheck.rows.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
      console.log("  ✅ Added missing column: users.role");
    } else {
      console.log("  ✓ Column exists: users.role");
    }

    // Set role = 'user' for any users with NULL role
    await pool.query("UPDATE users SET role = 'user' WHERE role IS NULL");
    console.log("  ✓ Ensured all users have a role set");

    // Check and add amount_with_gst column if missing
    const gstCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'amount_with_gst'
    `);
    if (gstCheck.rows.length === 0) {
      await pool.query("ALTER TABLE materials ADD COLUMN amount_with_gst NUMERIC DEFAULT 0");
      console.log("  ✅ Added missing column: amount_with_gst");
    } else {
      console.log("  ✓ Column exists: amount_with_gst");
    }

    // Check and add available_quantity column if missing
    const aqCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'available_quantity'
    `);
    if (aqCheck.rows.length === 0) {
      await pool.query("ALTER TABLE materials ADD COLUMN available_quantity INT DEFAULT 0");
      console.log("  ✅ Added missing column: available_quantity");
    } else {
      console.log("  ✓ Column exists: available_quantity");
    }

    // Check and add material_type column if missing
    const mtCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'material_type'
    `);
    if (mtCheck.rows.length === 0) {
      await pool.query("ALTER TABLE materials ADD COLUMN material_type VARCHAR(100)");
      console.log("  ✅ Added missing column: material_type");
    } else {
      console.log("  ✓ Column exists: material_type");
    }

    // Check and add supplier_address column if missing
    const saCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'supplier_address'
    `);
    if (saCheck.rows.length === 0) {
      await pool.query("ALTER TABLE materials ADD COLUMN supplier_address TEXT");
      console.log("  ✅ Added missing column: supplier_address");
    } else {
      console.log("  ✓ Column exists: supplier_address");
    }

    // Check and add bill_no_invoice column if missing
    const bnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'bill_no_invoice'
    `);
    if (bnCheck.rows.length === 0) {
      await pool.query("ALTER TABLE materials ADD COLUMN bill_no_invoice VARCHAR(100)");
      console.log("  ✅ Added missing column: bill_no_invoice");
    } else {
      console.log("  ✓ Column exists: bill_no_invoice");
    }

    // Check and add quantity column to transactions table if missing
    const qtyCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'quantity'
    `);
    if (qtyCheck.rows.length === 0) {
      await pool.query("ALTER TABLE transactions ADD COLUMN quantity INT DEFAULT 1");
      console.log("  ✅ Added missing column: transactions.quantity");
    } else {
      console.log("  ✓ Column exists: transactions.quantity");
    }

    // Check and add scan_time column to transactions table if missing
    const timeCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'scan_time'
    `);
    if (timeCheck.rows.length === 0) {
      await pool.query("ALTER TABLE transactions ADD COLUMN scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      console.log("  ✅ Added missing column: transactions.scan_time");
    } else {
      console.log("  ✓ Column exists: transactions.scan_time");
    }

    // ============================================
    // AUTO-SEED ADMIN USER
    // ============================================
    const adminCheck = await pool.query("SELECT * FROM users WHERE username = 'admin'");

    if (adminCheck.rows.length === 0) {
      console.log("👤 Admin user not found. Creating default admin...");
      await pool.query(`
          INSERT INTO users (username, password, fullname, mail, rollno, department, role)
          VALUES ('admin', 'admin123', 'System Admin', 'admin@rathinam.in', 'ADMIN001', 'OFFICE', 'admin')
        `);
      console.log("✅ Default admin created: admin / admin123");
    } else {
      console.log("✓ Admin user exists");
    }

    console.log("🔧 Migrations complete!");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  }
}

// ============================================
// START SERVER
// ============================================

// Run migrations then start server
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log("✅ All features enabled");
    console.log(`✅ Login with USERNAME or MAIL column enabled`);
    console.log(`✅ User update with OPTIONAL password enabled`);
    console.log(`✅ Bulk user upload enabled`);
    console.log(`✅ Material UPDATE (PUT) endpoint enabled`);
    console.log(`✅ Material DELETE endpoint enabled`);
    console.log(`✅ Lab Inventory endpoints: /lab-inventory (GET, PUT, DELETE)`);
    console.log(`📍 Database column: 'mail' (not 'email')`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
});