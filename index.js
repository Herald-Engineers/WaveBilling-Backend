require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT;
const fileUpload = require('express-fileupload');
const cors = require('cors');

const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const meterReaderRouter = require('./routes/meterReaderRouter');

// MongoDB connection
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB");
});

app.use(cors({origin: '*'}));

app.use(fileUpload({
  useTempFiles: true
}));
// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
// User userRouter to route the user related endpoints
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/reader', meterReaderRouter);

// Start server
app.listen(port, () => {
  console.log('Server running on port' + port);
});
