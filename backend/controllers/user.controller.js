import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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
      role: role || "User",
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
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth || null;
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
