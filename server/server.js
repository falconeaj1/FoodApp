import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get("/recipes/:query", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.edamam.com/search?q=${req.params.query}&app_id=${process.env.APP_ID}&app_key=${process.env.APP_KEY}`,
      {
        headers: {
          "Edamam-Account-User": "blah", // Replace 'YOUR_USER_ID' with a valid user ID
        },
      }
    );

    if (response.status >= 400) {
      throw new Error(`Edamam API returned error: ${response.statusText}`);
    }
	
    console.log(response.data.hits);
    res.json(response.data.hits);
  } catch (error) {
    console.error("Error fetching data from Edamam:", error.message);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening to ${PORT}`);
});
