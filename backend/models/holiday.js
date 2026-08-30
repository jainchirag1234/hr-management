import mongoose from "mongoose";

const holidaySchema=new mongoose.Schema({
    name:{
        type: String,
        required: [true, "Holiday name is required"],
        unique: true,
    },
    date:{
        type:Date,
        required: true,
    },Description:{
        type:String,
        
    },type:{
        type:String,
    }
   },
    {
        timestamps: true,
    },
);
export default mongoose.model("Holiday",holidaySchema)

