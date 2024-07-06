const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const excelJS = require('exceljs'); // Add excelJS for exporting data to Excel

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/eventTracking', { useNewUrlParser: true, useUnifiedTopology: true });

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
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve stats.html for the /stats route
app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

app.get('/stats-data', async (req, res) => {
  const names = await Name.find({});
  const doorCounts = names.reduce((acc, { door }) => {
    acc[door] = (acc[door] || 0) + 1;
    return acc;
  }, {});

  const totalCount = names.length;

  res.json({ doorCounts, totalCount });
});

app.post('/register', async (req, res) => {
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

app.get('/recent-names/:door', async (req, res) => {
  const { door } = req.params;
  const recentNames = await Name.find({ door }).sort({ timestamp: -1 }).limit(10);
  res.json(recentNames);
});

app.get('/all-names', async (req, res) => {
  const names = await Name.find({}).sort({ door: 1, timestamp: 1 });
  res.json(names);
});

// Door management routes
app.get('/doors', async (req, res) => {
  const doors = await Door.find({}).sort({ door: 1 });
  res.json(doors);
});

app.post('/doors', async (req, res) => {
  const { door } = req.body;
  const newDoor = new Door({ door });
  await newDoor.save();
  res.send(`Door ${door} created`);
});

app.put('/doors/:id', async (req, res) => {
  const { id } = req.params;
  const { newDoorName } = req.body;
  await Door.findByIdAndUpdate(id, { door: newDoorName });
  res.send(`Door updated to ${newDoorName}`);
});

app.delete('/doors/:id', async (req, res) => {
  const { id } = req.params;
  await Door.findByIdAndDelete(id);
  res.send(`Door deleted`);
});

app.get('/names/:name', async (req, res) => {
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


app.delete('/names/:id', async (req, res) => {
  const { id } = req.params;
  await Name.findByIdAndDelete(id);
  res.send(`Name entry deleted`);
});

app.get('/export', async (req, res) => {
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
app.post('/archive', async (req, res) => {
  const { eventName } = req.body;
  const names = await Name.find({});
  const newArchive = new Archive({ eventName, data: names });
  await newArchive.save();
  res.send('Event data archived');
});

app.get('/archives', async (req, res) => {
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

app.get('/archive/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const archive = await Archive.findById(id);
    res.json(archive);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Export archived data
app.get('/export-archive/:id', async (req, res) => {
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
app.delete('/archive/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Archive.findByIdAndDelete(id);
    res.send(`Archived data deleted`);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete all entries for an event
app.delete('/names', async (req, res) => {
  await Name.deleteMany({});
  res.send(`All entries deleted`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/names', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'names.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

server.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
