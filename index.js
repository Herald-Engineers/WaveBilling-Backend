const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

const config = require("./config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ObjectId = mongoose.Types.ObjectId;

// MongoDB connection
mongoose.connect(config.database, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB");
});

// Register company ---------------------------------------

// Define schemas for organization and login details
const organizationSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  addressDistrict: {
    type: String,
    required: true
  },
  addressProvince: {
    type: String,
    required: true
  },
  addressWardNum: {
    type: String,
    required: true
  },
  addressMunicipality: {
    type: String,
    required: true
  },
  addressTole: {
    type: String,
    required: true
  },
  contactNum: {
    type: String,
    required: true
  }
});
const loginSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    default: 'admin'
  },
  distributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }
});

// Create models for organization and login details
const Organization = mongoose.model('Organization', organizationSchema);
const Login = mongoose.model('Login', loginSchema);

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/', async(req, res) => {
  res.send('Server working at port:' + port);
})

// POST endpoint for registration
app.post('/register', async (req, res) => {
  try {
    // Check if an organization with the same details already exists
    const alreadyExists = await Organization.findOne({
      companyName: req.body.companyName,
      addressDistrict: req.body.addressDistrict,
      addressProvince: req.body.addressProvince,
      addressWardNum: req.body.addressWardNum,
      addressMunicipality: req.body.addressMunicipality,
      addressTole: req.body.addressTole
    });

    if (alreadyExists) {
      return res.status(409).json({ error: 'Organization already exists' });
    }

    const usernameTaken = await Login.findOne({
      username: req.body.username
    });

    if (usernameTaken) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create new organization and login details objects from request body
    const organization = new Organization({
      companyName: req.body.companyName,
      addressDistrict: req.body.addressDistrict,
      addressProvince: req.body.addressProvince,
      addressWardNum: req.body.addressWardNum,
      addressMunicipality: req.body.addressMunicipality,
      addressTole: req.body.addressTole,
      contactNum: req.body.contactNum
    });

    // Save organization details to MongoDB
    await organization.save();

    // async function insertCredentials() {
    //   try {
    //     const org = await Organization.findOne({ contactNum: req.body.contactNum });
    //     return org._id;
    //   } catch (err) {
    //     console.log(err);
    //   }
    // }   

    let orgId = await Organization.findOne({ contactNum: req.body.contactNum });
    orgId = orgId._id.toString();

    const login = new Login({
      username: req.body.username,
      password: await bcrypt.hash(req.body.password, 10),
      distributorId: new ObjectId(orgId)
    });

    // Save login details to MongoDB
    await login.save();

    // Return success message to client
    res.status(200).send('Registration successful');
  } catch (err) {
    console.error(err)
    res.status(500).send('Error registering user');
  }
});


// Login ---------------------------------------
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Login.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: "No user found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password incorrect" });
    }

    const token = jwt.sign(
      { username: user.username, userRole: user.userRole },
      config.secret
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
})

// Start server
app.listen(port, () => {
  console.log('Server running on port' + port);
});
