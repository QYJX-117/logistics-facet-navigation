const express = require('express');
const db = require('./database');
const app = express();
const port = Number(process.env.PORT) || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to handle CORS (Cross-Origin Resource Sharing)
// This allows the frontend to make requests to the backend from a different origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API endpoint to get all facets and their values
app.get('/api/facets', async (req, res) => {
  try {
    const facets = await db.getFacets();
    res.json(facets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get services based on filters
// Filters are passed as a JSON object in the request body
app.post('/api/services', async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const services = await db.getServices(filters);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});