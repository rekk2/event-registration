const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const excelJS = require('exceljs'); // Add excelJS for exporting data to Excel
require('dotenv').config(); // Load environment variables
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, enum: ['main-admin', 'admin', 'door-user'], default: 'door-user' }
});

const User = mongoose.model('User', userSchema);

// Function to create main admin user
const createMainAdminUser = async () => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('Admin username or password is not set in the .env file');
    process.exit(1);
  }

  const user = await User.findOne({ username: adminUsername });
  if (!user) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const adminUser = new User({ username: adminUsername, password: hashedPassword, role: 'main-admin' });
    await adminUser.save();
    console.log('Main admin user created');
  } else if (user.role !== 'main-admin') {
    user.role = 'main-admin';
    await user.save();
    console.log('Main admin user role updated');
  } else {
    console.log('Main admin user already exists');
  }
};

// Call the function to create the main admin user
createMainAdminUser();

// Define schemas and models
const nameSchema = new mongoose.Schema({
  door: String,
  name: String,
  timestamp: { type: Date, default: Date.now }
});

const Name = mongoose.model('Name', nameSchema);

const doorSchema = new mongoose.Schema({
  door: String
});

const Door = mongoose.model('Door', doorSchema);

const archiveSchema = new mongoose.Schema({
  eventName: String,
  timestamp: { type: Date, default: Date.now },
  data: [nameSchema]
});

const Archive = mongoose.model('Archive', archiveSchema);

// Middleware to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Role-based middleware
function isMainAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'main-admin') {
    return next();
  } else {
    res.status(403).send('Forbidden');
  }
}

app.delete('/users/:id', isMainAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.send('User deleted');
  } catch (error) {
    res.status(500).send(error);
  }
});

// Add these routes for fetching and deleting users
app.get('/users', isMainAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

function isAdmin(req, res, next) {
  if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'main-admin')) {
    return next();
  } else {
    res.status(403).send('Forbidden');
  }
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role
    };
    res.redirect('/door');
  } else {
    res.send('Invalid username or password');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protect all routes except login and static files
app.use((req, res, next) => {
  if (req.path !== '/login' && req.path !== '/logout' && !req.path.startsWith('/public')) {
    isAuthenticated(req, res, next);
  } else {
    next();
  }
});

app.get('/user-role', (req, res) => {
  if (req.session.user) {
    res.json({ role: req.session.user.role });
  } else {
    res.status(403).send('Forbidden');
  }
});

// Application routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/door');
  } else {
    res.redirect('/login');
  }
});

app.get('/door', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'door.html'));
});

app.get('/names', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'names.html'));
});

app.get('/admin', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/createadmin', isMainAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'createadmin.html'));
});

app.post('/createadmin', isMainAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = new User({ username, password: hashedPassword, role });
  await newUser.save();
  res.send(`User ${username} with role ${role} created`);
});

// Application routes for event management
app.get('/stats', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

app.get('/stats-data', isAuthenticated, async (req, res) => {
  const names = await Name.find({});
  const doorCounts = names.reduce((acc, { door }) => {
    acc[door] = (acc[door] || 0) + 1;
    return acc;
  }, {});

  const totalCount = names.length;

  res.json({ doorCounts, totalCount });
});

app.post('/register', isAuthenticated, async (req, res) => {
  const { door, name } = req.body;
  if (!door || !name) {
    return res.status(400).send('Door and name are required');
  }

  const newName = new Name({ door, name });
  await newName.save();

  // Emit updated stats to all connected clients
  const names = await Name.find({});
  const doorCounts = names.reduce((acc, { door }) => {
    acc[door] = (acc[door] || 0) + 1;
    return acc;
  }, {});

  const totalCount = names.length;

  io.emit('statsUpdate', { doorCounts, totalCount });

  // Emit new name to update all names page
  io.emit('newName', { newName, doorCounts, totalCount });

  res.send(`Name ${name} registered at door ${door}`);
});

app.get('/recent-names/:door', isAdmin, async (req, res) => {
  const { door } = req.params;
  const recentNames = await Name.find({ door }).sort({ timestamp: -1 }).limit(10);
  res.json(recentNames);
});

app.get('/all-names', isAdmin, async (req, res) => {
  const names = await Name.find({}).sort({ door: 1, timestamp: 1 });
  res.json(names);
});

// Door management routes
app.get('/doors', isAdmin, async (req, res) => {
  const doors = await Door.find({}).sort({ door: 1 });
  res.json(doors);
});

app.post('/doors', isAdmin, async (req, res) => {
  const { door } = req.body;
  const newDoor = new Door({ door });
  await newDoor.save();
  res.send(`Door ${door} created`);
});

app.put('/doors/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { newDoorName } = req.body;
  await Door.findByIdAndUpdate(id, { door: newDoorName });
  res.send(`Door updated to ${newDoorName}`);
});

app.delete('/doors/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  await Door.findByIdAndDelete(id);
  res.send(`Door deleted`);
});

app.get('/names/:name', isAdmin, async (req, res) => {
  const { name } = req.params;
  const { allEvents } = req.query; // Get query parameter

  const regex = new RegExp(name, 'i'); // Create a case-insensitive regex

  if (allEvents === 'true') {
    // Search all events (including archived)
    const archives = await Archive.find({ 'data.name': { $regex: regex } });
    const results = archives.flatMap(archive => archive.data.filter(entry => regex.test(entry.name)));
    res.json(results);
  } else {
    // Search only current event
    const nameEntries = await Name.find({ name: { $regex: regex } });
    res.json(nameEntries);
  }
});

app.delete('/names/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  await Name.findByIdAndDelete(id);
  res.send(`Name entry deleted`);
});

app.get('/export', isAdmin, async (req, res) => {
  try {
    const names = await Name.find({}).sort({ timestamp: 1 });
    const doorCounts = names.reduce((acc, { door }) => {
      acc[door] = (acc[door] || 0) + 1;
      return acc;
    }, {});
    const totalCount = names.length;

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Event Data');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Door', key: 'door', width: 10 },
      { header: 'Timestamp', key: 'timestamp', width: 25 }
    ];

    names.forEach(name => {
      worksheet.addRow({
        name: name.name,
        door: name.door,
        timestamp: new Date(name.timestamp).toLocaleString()
      });
    });

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Door', key: 'door', width: 25 },
      { header: 'Count', key: 'count', width: 10 }
    ];

    for (const [door, count] of Object.entries(doorCounts)) {
      summarySheet.addRow({ door, count });
    }
    summarySheet.addRow({ door: 'Total', count: totalCount });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=event_data.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).send(error);
  }
});

// Archive event data
app.post('/archive', isAdmin, async (req, res) => {
  const { eventName } = req.body;
  const names = await Name.find({});
  const newArchive = new Archive({ eventName, data: names });
  await newArchive.save();
  res.send('Event data archived');
});

app.get('/archives', isAdmin, async (req, res) => {
  try {
    const archives = await Archive.find({});
    const archiveData = archives.map(archive => ({
      _id: archive._id,
      eventName: archive.eventName,
      timestamp: archive.timestamp,
      totalCount: archive.data.length
    }));
    res.json(archiveData);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/archive/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const archive = await Archive.findById(id);
    res.json(archive);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Export archived data
app.get('/export-archive/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const archive = await Archive.findById(id);
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Archived Event Data');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Door', key: 'door', width: 10 },
      { header: 'Timestamp', key: 'timestamp', width: 25 }
    ];

    archive.data.forEach(entry => {
      worksheet.addRow({
        name: entry.name,
        door: entry.door,
        timestamp: new Date(entry.timestamp).toLocaleString()
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=archive_${archive.eventName}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete archived data
app.delete('/archive/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Archive.findByIdAndDelete(id);
    res.send(`Archived data deleted`);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete all entries for an event
app.delete('/names', isAdmin, async (req, res) => {
  await Name.deleteMany({});
  res.send(`All entries deleted`);
});

server.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
