require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');
const seedModerator = require('./utils/seedModerator');
const seedClinicServices = require('./utils/seedClinicServices');

const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const userRoutes = require('./routes/userRoutes');
const clinicServiceRoutes = require('./routes/clinicServiceRoutes');

const Pet = require('./models/Pet');
const Appointment = require('./models/Appointment');
const Reminder = require('./models/Reminder');
const MedicalRecord = require('./models/MedicalRecord');
const ClinicService = require('./models/ClinicService');
const User = require('./models/User');

const app = express();

// Middlewares
app.use(express.json({ limit: '8mb' })); // raised so base64 photo uploads (avatars, pet photos) fit
app.use(cors());

// Database — once connected, make sure the pre-created admin and
// moderator (staff) accounts exist
connectDB().then(() => {
  seedAdmin();
  seedModerator();
  seedClinicServices();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clinic/services', clinicServiceRoutes);

// Dashboard Summary — shaped to match what Dashboard.jsx expects:
// { stats: {...}, pets: [...], reminders: [{ petName, title, dueDate }] }
app.get('/api/owner/dashboard', async (req, res) => {
  try {
    const [pets, appointments, reminders] = await Promise.all([
      Pet.find(),
      Appointment.find(),
      Reminder.find().populate('pet', 'name')
    ]);

    const upcomingAppts = appointments.filter(
      (a) => a.status === 'Scheduled' && a.approvalStatus === 'Approved'
    ).length;
    const dueVaccines = reminders.filter((r) => r.status !== 'Done').length;
    const clinicsVisited = new Set(appointments.map((a) => a.clinicBranch)).size;

    res.json({
      stats: {
        totalPets: pets.length,
        upcomingAppts,
        dueVaccines,
        clinicsVisited
      },
      pets,
      reminders: reminders.map((r) => ({
        _id: r._id,
        petName: r.pet?.name?.toUpperCase() || 'PET',
        title: r.title,
        dueDate: r.dueDate
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Clinic Admin Dashboard — real stats + today's queue for AdminClinic.jsx
app.get('/api/clinic/dashboard', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [pets, appointments, services, records, totalUsers] = await Promise.all([
      Pet.find(),
      Appointment.find(),
      ClinicService.find({ active: true }),
      MedicalRecord.find(),
      User.countDocuments()
    ]);

    // only approved bookings make it onto the clinic queue
    const approved = appointments.filter((a) => a.approvalStatus === 'Approved');
    const todaysAppointments = approved.filter((a) => a.date === todayStr);
    const pendingApprovals = appointments.filter((a) => a.approvalStatus === 'Pending').length;

    res.json({
      stats: {
        todaysAppointments: todaysAppointments.length,
        totalPatients: pets.length,
        activeServices: services.length,
        pendingRecords: records.length,
        pendingApprovals,
        totalUsers
      },
      queue: todaysAppointments
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        .map((a) => ({
          _id: a._id,
          time: a.time || '—',
          pet: a.petName,
          service: a.service,
          queueStatus: a.queueStatus
        }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Run Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PetCare Backend Server running on http://localhost:${PORT}`);
});
