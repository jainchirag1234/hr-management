import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// ======================================
// CREATE User
// POST /api/user/create
// ======================================
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      profileImage,
      dateOfBirth,
      gender,
      address,
      joiningDate,
      department,
      designation,
      salary,
      employmentType,
      role,
      status,
      emergencyContactName,
      emergencyContactNumber,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !password ||
      !joiningDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // ✅ Email format validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    // ✅ Phone number validation — Indian 10-digit number, starting 6-9
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }
    if (isNaN(new Date(joiningDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid joining date",
      });
    }

    // ✅ Date of birth validation - Must be at least 18 years old
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date of birth",
        });
      }
      const today = new Date();
      const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      if (dobDate > minDate) {
        return res.status(400).json({
          success: false,
          message: "User must be at least 18 years old",
        });
      }
    }

    // ✅ Password length validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      profileImage,
      dateOfBirth,
      gender,
      address,
      joiningDate,
      department,
      designation,
      salary,
      employmentType,
      role: role || "Employee",
      status: status || "Active",
      emergencyContactName,
      emergencyContactNumber,
    });

    const userData = user.toObject();
    delete userData.password;

    return res.status(201).json({
      success: true,
      message: "User Created Successfully",
      data: userData,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// LOGIN
// POST /api/user/login
// ======================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    if (user.status && user.status.toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}`,
      });
    }

    const token = jwt.sign(
      {
        jti: crypto.randomUUID(), // Har login pe naya unique ID
        id: user._id,
        employeeId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      success: true,
      message: "Login Successful",

      token,

      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// GET ALL Users (Employees only, Admin excluded)
// GET /api/user
// ======================================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "Admin" } }).select(
      "-password",
    );

    return res.status(200).json({
      success: true,
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// GET User BY ID
// GET /api/user/:id
// ======================================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Invalid MongoDB ObjectId format ko pehle hi rok do,
    // warna findById crash karke 500 de dega
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// UPDATE User
// PUT /api/user/:id
// ======================================
export const updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      profileImage,
      dateOfBirth,
      gender,
      address,
      joiningDate,
      department,
      designation,
      salary,
      employmentType,
      role,
      status,
      emergencyContactName,
      emergencyContactNumber,
    } = req.body;

    // ✅ Sirf wahi fields update karo jo actually send ki gayi hain
    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    // ✅ Email — validate + duplicate check sirf tab jab email bheji gayi ho
    if (email !== undefined) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email",
        });
      }

      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      updateData.email = email;
    }

    // ✅ Phone number — validate sirf tab jab bheja gaya ho
    if (phoneNumber !== undefined) {
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number",
        });
      }
      updateData.phoneNumber = phoneNumber;
    }

    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const dobDate = new Date(dateOfBirth);
        if (isNaN(dobDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth",
          });
        }
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        if (dobDate > minDate) {
          return res.status(400).json({
            success: false,
            message: "User must be at least 18 years old",
          });
        }
      }
      updateData.dateOfBirth = dateOfBirth || null;
    }
    if (address !== undefined) updateData.address = address;
    if (joiningDate !== undefined) {
      if (joiningDate && isNaN(new Date(joiningDate).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid joining date",
        });
      }
      updateData.joiningDate = joiningDate || null;
    }
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (salary !== undefined) updateData.salary = salary;
    if (emergencyContactName !== undefined)
      updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined)
      updateData.emergencyContactNumber = emergencyContactNumber;

    // ✅ Enum fields — sirf tab update karo jab valid value di gayi ho
    // Empty string "" dene se Mongoose enum validation fail ho jaata hai
    if (gender && gender !== "") updateData.gender = gender;
    if (employmentType && employmentType !== "")
      updateData.employmentType = employmentType;
    if (role && role !== "") updateData.role = role;
    if (status && status !== "") updateData.status = status;

    // ✅ Password — sirf tab validate + hash karo jab diya gaya ho
    if (password && password !== "") {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Updated Successfully",
      data: user,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// DELETE User
// DELETE /api/user/:id
// ======================================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Deleted Successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// UPDATE STATUS
// PATCH /api/user/:id/status
// ======================================
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Status Updated Successfully",
      data: user,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// FORGOT PASSWORD
// POST /api/user/forgot-password
// ======================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Security: Even if user not found, return success (prevent email enumeration)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a reset link has been sent.",
      });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save hashed token + expiry to DB (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Build reset URL (frontend URL)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1d4ed8; margin: 0;">🔐 HRMS Password Reset</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${user.firstName}</strong>,</p>
          <p style="color: #6b7280;">We received a request to reset your HRMS account password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1d4ed8; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">HR Management System &bull; Do not reply to this email</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "HRMS - Password Reset Request",
      html,
    });

    return res.status(200).json({
      success: true,
      message: "If this email is registered, a reset link has been sent.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================
// RESET PASSWORD
// POST /api/user/reset-password/:token
// ======================================
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Hash the incoming token to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token. Please request a new one.",
      });
    }

    // Update password and clear token fields
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

