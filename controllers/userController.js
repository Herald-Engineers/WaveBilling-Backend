require('dotenv').config()
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const organizationModel = require('../models/organizationModel');
const requestAccountModel = require('../models/requestAccountModel');
const bcrypt = require('bcrypt');

// Cloudinary configuration 
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: "duwbog7sb",
  api_key: "621392192137183",
  api_secret: "eY9L7xmwKu7uWftoy-8OGhuT0pQ"
});

const register = async (req, res) => {
    const {companyName, addressDistrict, addressProvince, addressWardNum, addressMunicipality, addressTole, contactNum, username, password} = req.body;
    
    try {
       // Check if organization already exists
        const alreadyExists = await organizationModel.findOne({
            companyName,
            addressDistrict,
            addressProvince,
            addressWardNum,
            addressMunicipality
        });
        if (alreadyExists) {
            return res.status(409).json({ error: 'Organization already exists' });
        }

        // Check if username is taken
        const usernameTaken = await userModel.findOne({
            username
        });
        if (usernameTaken) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Save organization details to MongoDB
        const organizationCreated = await organizationModel.create({
            companyName,
            addressProvince,
            addressDistrict,
            addressMunicipality,
            addressWardNum,
            addressTole,
            contactNum
        })

        // Preparing the orgId and hashed password for user
        let orgId = await organizationModel.findOne({ contactNum });
        // orgId = orgId._id;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user details to MongoDB
        const userCreated = await userModel.create({
            username,
            password: hashedPassword,
            distributorId: orgId._id
        })

        // Create token and send response
        const token = jwt.sign({username: userCreated.username, id: userCreated._id}, process.env.ACCESS_TOKEN_SECRET);
        res.status(201).json({username: userCreated.username, role: userCreated.userRole, token});
    } catch(err) {
        console.log(process.env.ACCESS_TOKEN_SECRET);
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
    
}

const login = async (req, res) => {
    const {username, password} = req.body;
    try {
        // Check if user exists in server
        const user = await userModel.findOne({ username });
        if (!user) {
          return res.status(404).json({ message: "No user found" });
        }
    
        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "Password incorrect" });
        }
    
        // Create token and send response
        const token = jwt.sign({username: user.username, id: user._id}, process.env.ACCESS_TOKEN_SECRET);
        res.status(200).json({username: user.username, role: user.userRole, token});
    } catch(err) {
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
}

const requestAccount = async (req, res) => {    
    const {firstName, lastName, houseNo, tole, wardNo, municipality, tel1, tel2, email, nationality, citizenshipNo, passportNo, supName, supTelephone, supEmail } = req.body;
    const {citizenshipDoc, landOwnershipDoc} = req.files;

    // If request is already made
    const alreadyMade = await requestAccountModel.findOne({ houseNo, citizenshipNo });
    console.log(alreadyMade);
    if(alreadyMade) {
        return res.status(409).json({message: 'Request already made'});
    }

    // If account already exits
    // to-do
    
    // Upload the docs to cloudinary and get the link
    const citizenshipUrl = await cloudinary.uploader.upload(citizenshipDoc.tempFilePath, {public_id: `GuestUserDocs/${citizenshipNo}`})
    .then((result) => result.url).catch(() => res.status(500).json({message: "Error occurred while uploading document"}));
    const landOwnershipUrl = await cloudinary.uploader.upload(landOwnershipDoc.tempFilePath, {public_id: `GuestUserDocs/${houseNo}_${citizenshipNo}`})
    .then((result) => result.url).catch(() => res.status(500).json({message: "Error occurred while uploading document"}));

    try {
        const requestSent = await requestAccountModel.create({
            firstName,
            lastName,
            houseNo,
            tole,
            wardNo,
            municipality,
            tel1,
            tel2,
            email,
            nationality,
            citizenshipNo,
            passportNo,
            supName,
            supTelephone,
            supEmail,
            citizenshipDoc: citizenshipUrl,
            landOwnershipDoc: landOwnershipUrl
        })
        res.status(200).json({message: "Request made successfully"});
    } catch(err) {
        res.status(500).json({message: "Server error"});
    }
}

module.exports = {login, register, requestAccount};