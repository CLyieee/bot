require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define a wrapper to maintain compatibility with the current quick.db interface
const db = {
  // Get data from Supabase
  async get(key) {
    try {
      const { data, error } = await supabase
        .from("bot_data")
        .select("value")
        .eq("key", key)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no rows are found

      // Return null if no data found or if there's an error
      if (error || !data) {
        if (error && error.code !== "PGRST116") {
          // Ignore "no rows returned" error
          console.error("Supabase get error:", error);
        }
        return null;
      }

      return JSON.parse(data.value);
    } catch (err) {
      console.error("Error getting data from Supabase:", err);
      return null;
    }
  },

  // Set data in Supabase
  async set(key, value) {
    try {
      // Convert value to string if it's an object
      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      // Check if the key already exists
      const { data: existingData } = await supabase
        .from("bot_data")
        .select()
        .eq("key", key);

      if (existingData && existingData.length > 0) {
        // Update existing record
        const { data, error } = await supabase
          .from("bot_data")
          .update({ value: stringValue })
          .eq("key", key);

        if (error) {
          console.error("Supabase update error:", error);
          return null;
        }

        return value;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from("bot_data")
          .insert([{ key, value: stringValue }]);

        if (error) {
          console.error("Supabase insert error:", error);
          return null;
        }

        return value;
      }
    } catch (err) {
      console.error("Error setting data in Supabase:", err);
      return null;
    }
  },

  // Add a value to a numeric field
  async add(key, amount) {
    try {
      const currentValue = (await this.get(key)) || 0;
      const newValue = currentValue + amount;
      await this.set(key, newValue);
      return newValue;
    } catch (err) {
      console.error("Error adding value in Supabase:", err);
      return null;
    }
  },

  // Subtract a value from a numeric field
  async subtract(key, amount) {
    return await this.add(key, -amount);
  },

  // Push an item to an array
  async push(key, element) {
    try {
      const array = (await this.get(key)) || [];
      array.push(element);
      await this.set(key, array);
      return array;
    } catch (err) {
      console.error("Error pushing to array in Supabase:", err);
      return null;
    }
  },

  // Delete a key
  async delete(key) {
    try {
      const { error } = await supabase.from("bot_data").delete().eq("key", key);

      if (error) {
        console.error("Supabase delete error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error deleting from Supabase:", err);
      return false;
    }
  },

  // Check if a key exists
  async has(key) {
    try {
      const { data, error } = await supabase
        .from("bot_data")
        .select("key")
        .eq("key", key);

      if (error) {
        console.error("Supabase has error:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error("Error checking key in Supabase:", err);
      return false;
    }
  },

  // Get all keys matching a pattern
  async all(pattern = null) {
    try {
      let query = supabase.from("bot_data").select("key, value");

      if (pattern) {
        // Convert quick.db pattern to SQL LIKE pattern
        const sqlPattern = pattern.replace(/\*/g, "%");
        query = query.like("key", sqlPattern);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase all error:", error);
        return [];
      }

      return data
        ? data.map((item) => ({
            id: item.key,
            value: JSON.parse(item.value),
          }))
        : [];
    } catch (err) {
      console.error("Error getting all keys from Supabase:", err);
      return [];
    }
  },
};

module.exports = db;
