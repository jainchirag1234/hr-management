import Holiday from "../models/holiday.js";

export const createHoliday = async (req, res) => {
  try {
    const { name, date, Description, type } = req.body;

    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: "Name and date are required",
      });
    }

    const existingHoliday = await Holiday.findOne({ name });
    if (existingHoliday) {
      return res.status(409).json({
        success: false,
        message: "Holiday with this name already exists",
      });
    }

    const holiday = await Holiday.create({ name, date, Description, type });

    return res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
// @route   GET /api/holidays
export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// @route   PUT /api/holidays/:id
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, Description, type } = req.body;

    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    // agar naam change ho raha hai to duplicate check kar lo
    if (name && name !== holiday.name) {
      const existingHoliday = await Holiday.findOne({ name });
      if (existingHoliday) {
        return res.status(409).json({
          success: false,
          message: "Holiday with this name already exists",
        });
      }
    }

    const updatedHoliday = await Holiday.findByIdAndUpdate(
      id,
      { name, date, Description, type },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: updatedHoliday,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// @route   DELETE /api/holidays/:id
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    await Holiday.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
