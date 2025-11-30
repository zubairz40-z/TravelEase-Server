const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ Environment variables
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "travleaseDB";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(dbName);
    const vehiclesCollection = db.collection("vehicles");
    const bookingsCollection = db.collection("bookings");

    // ---------------- ROOT ----------------
    app.get("/", (req, res) => {
      res.send("TravelEase server is running 🚗");
    });

    // --------------- VEHICLES ---------------

    // Get all vehicles
    app.get("/vehicles", async (req, res) => {
      try {
        const cursor = vehiclesCollection.find().sort({ createdAt: -1 });
        const vehicles = await cursor.toArray();
        res.json(vehicles);
      } catch (error) {
        console.error("Error in GET /vehicles:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to fetch vehicles" });
      }
    });

    // Add vehicle
    app.post("/vehicles", async (req, res) => {
      try {
        const vehicleData = req.body;

        if (!vehicleData.vehicleName || !vehicleData.userEmail) {
          return res.status(400).json({
            success: false,
            error: "vehicleName and userEmail are required",
          });
        }

        vehicleData.createdAt = new Date();

        const result = await vehiclesCollection.insertOne(vehicleData);

        res.json({
          success: true,
          message: "Vehicle added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error in POST /vehicles:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to add vehicle" });
      }
    });

    // Get one vehicle by ID
    app.get("/vehicles/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid vehicle id" });
        }

        const query = { _id: new ObjectId(id) };
        const vehicle = await vehiclesCollection.findOne(query);

        if (!vehicle) {
          return res
            .status(404)
            .json({ success: false, error: "Vehicle not found" });
        }

        res.json(vehicle);
      } catch (error) {
        console.error("Error in GET /vehicles/:id:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to fetch vehicle" });
      }
    });

    // Get vehicles of logged-in user
    app.get("/my-vehicles", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).json({
            success: false,
            error: "Email query parameter is required",
          });
        }

        const query = { userEmail: email };
        const vehicles = await vehiclesCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.json(vehicles);
      } catch (error) {
        console.error("Error in GET /my-vehicles:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch user vehicles",
        });
      }
    });

    // Update vehicle
    app.put("/vehicles/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid vehicle id" });
        }

        const updateData = req.body;
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            vehicleName: updateData.vehicleName,
            owner: updateData.owner,
            category: updateData.category,
            pricePerDay: updateData.pricePerDay,
            location: updateData.location,
            availability: updateData.availability,
            description: updateData.description,
            coverImage: updateData.coverImage,
          },
        };

        const result = await vehiclesCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ success: false, error: "Vehicle not found" });
        }

        res.json({
          success: true,
          message: "Vehicle updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("Error in PUT /vehicles/:id:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to update vehicle" });
      }
    });

    // Delete vehicle
    app.delete("/vehicles/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid vehicle id" });
        }

        const filter = { _id: new ObjectId(id) };
        const result = await vehiclesCollection.deleteOne(filter);

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ success: false, error: "Vehicle not found" });
        }

        res.json({ success: true, message: "Vehicle deleted successfully" });
      } catch (error) {
        console.error("Error in DELETE /vehicles/:id:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to delete vehicle" });
      }
    });

    // --------------- BOOKINGS ---------------

    // Create booking
    app.post("/bookings", async (req, res) => {
      try {
        const bookingData = req.body;

        // ✅ Require these fields (harder version)
        if (
          !bookingData.vehicleId ||
          !bookingData.userEmail ||
          !bookingData.startDate ||
          !bookingData.endDate
        ) {
          return res.status(400).json({
            success: false,
            error: "vehicleId, userEmail, startDate and endDate are required",
          });
        }

        // Optional: Normalize dates before storing
        try {
          bookingData.startDate = new Date(bookingData.startDate);
          bookingData.endDate = new Date(bookingData.endDate);
        } catch {
          return res.status(400).json({
            success: false,
            error: "Invalid date format for startDate or endDate",
          });
        }

        bookingData.status = bookingData.status || "pending";
        bookingData.createdAt = new Date();

        const result = await bookingsCollection.insertOne(bookingData);

        res.json({
          success: true,
          message: "Booking created successfully",
          bookingId: result.insertedId,
        });
      } catch (error) {
        console.error("Error in POST /bookings:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to create booking" });
      }
    });

    // Get bookings for logged-in user
    app.get("/my-bookings", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).json({
            success: false,
            error: "Email query parameter is required",
          });
        }

        const query = { userEmail: email };
        const bookings = await bookingsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.json(bookings);
      } catch (error) {
        console.error("Error in GET /my-bookings:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch user bookings",
        });
      }
    });

    // Delete / cancel booking
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid booking id" });
        }

        const filter = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(filter);

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ success: false, error: "Booking not found" });
        }

        res.json({ success: true, message: "Booking deleted successfully" });
      } catch (error) {
        console.error("Error in DELETE /bookings/:id:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to delete booking" });
      }
    });

    // --------------- START SERVER ---------------
    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Error in run():", err);
  }
}

run().catch(console.dir);
