// config/database.js

import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// --------------------
// Supabase
// --------------------
const supabaseUrl = process.env.project_url;
const supabaseKey = process.env.supabaseurl;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key missing in .env file!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase client created");

export default supabase;
