require('dotenv').config()
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const companiesModel = require('../models/companiesModel');
const usrDetailsModel = require('../models/usrDetailsModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Cloudinary configuration 
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const registerCompany = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { companyName, address, email1, fullName, email2, jobTitle, contactNum, paymentMethod, bankName, accountNum, billingCycle, paymentDueDate, estimatedWaterUsage, noOfMeters } = req.body;

    // If any of the fields is null 
    if(!companyName || !address || !email1 || !fullName || !email2 || !jobTitle || !contactNum || !paymentMethod || !bankName || !accountNum || !billingCycle || !paymentDueDate || !estimatedWaterUsage || !noOfMeters) return res.status(422).json({message: 'Please fill all the fields'});
    
    try {
       // Check if organization already exists
        const alreadyExists = await companiesModel.findOne({
            companyName,
            email1
        });
        if (alreadyExists) {
            return res.status(409).json({ message: 'Organization already exists' });
        }

        // Generate username
        let username;
        do {
            username = 'com' + Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit number
        } while (await userModel.findOne({ userId: username })); // Check if the username already exists in the database

        const password = 'company123';

        // Create login credentials in database
        const createdLogin = await userModel.create({
            userId: username,
            password: await bcrypt.hash(password, 10),
            userRole: 'companyConsumer'
        });

        // Save organization details to MongoDB
        await companiesModel.create({
            companyName, address, email1, fullName, email2, jobTitle, contactNum, paymentMethod, bankName, accountNum, billingCycle, paymentDueDate, estimatedWaterUsage, noOfMeters, loginId: createdLogin._id
        });

        res.status(201).json({ message: 'Successfully registered', userId: username, password });
    } catch(err) {
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
    
}

const registerUser = async (req, res) => {
    if(req.body == null) {
        return res.status(422).json({message: 'req.body is null'});
    } else if(req.files == null) {
        return res.status(422).json({message: 'req.files is null'});
    }

    const { firstName, middleName, lastName, houseNo, province, municipality, wardNo, tole, tel1, tel2, email, nationality, citizenshipNo, issueDate } = req.body;
    const { citizenshipDoc, landOwnershipDoc } = req.files;

    if(!firstName || !lastName || !houseNo || !province || !municipality || !wardNo || !tole || !tel2 || !email || !nationality || !citizenshipNo || !issueDate) {
        return res.status(422).json({message: 'Please fill all the required fields'});
    }
    
    // If request is already made
    const alreadyRegistered = await usrDetailsModel.findOne({ citizenshipNo, houseNo  });
    if(alreadyRegistered) {
        return res.status(409).json({message: 'User is already registered'});
    }

    // Generate username
    let username;
    do {
        username = 'usr' + Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit number
    } while (await userModel.findOne({ userId: username })); // Check if the username already exists in the database
    const password = 'user123'

    // Create login credentials in database
    const createdLogin = await userModel.create({
        userId: username,
        password: await bcrypt.hash(password, 10),
        userRole: 'individualConsumer'
    });
    
    // Upload the docs to cloudinary and get the link
    const citizenshipUrl = await cloudinary.uploader.upload(citizenshipDoc.tempFilePath, {public_id: `GuestUserDocs/${citizenshipNo}`})
    .then((result) => result.url).catch(() => res.status(500).json({message: "Error occurred while uploading document"}));

    const landOwnershipUrl = await cloudinary.uploader.upload(landOwnershipDoc.tempFilePath, {public_id: `GuestUserDocs/${houseNo}_${citizenshipNo}`})
    .then((result) => result.url).catch(() => res.status(500).json({message: "Error occurred while uploading document"}));

    try {
        await usrDetailsModel.create({
            firstName,
            middleName,
            lastName,
            houseNo,
            province,
            municipality,
            wardNo,
            tole,
            tel1,
            tel2,
            email,
            nationality,
            citizenshipNo,
            issueDate,
            citizenshipDoc: citizenshipUrl,
            landOwnershipDoc: landOwnershipUrl,
            loginId: createdLogin._id
        });
        res.status(200).json({message: "Request made successfully", userId: username, password});
    } catch(err) {
        res.status(500).json({message: "Server error"});
    }
}

const login = async (req, res) => {
    if(req.body == null) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const {username, password} = req.body;
    if(!username || !password) {
        return res.status(422).json({message: 'Please fill all the fields'});
    }
    try {
        // Check if user exists in server
        const user = await userModel.findOne({ userId: username });
        if (!user) {
          return res.status(404).json({ message: "No user found" });
        }
    
        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "Password incorrect" });
        }
    
        // Create token and send response
        const token = jwt.sign({userId: user.userId, userRole: user.userRole, id: user._id}, process.env.ACCESS_TOKEN_SECRET);
        res.status(200).json({userId: user.userId, role: user.userRole, token});
    } catch(err) {
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
}

const resetPassword = async (req, res) => {
    const userName = req.body.userName;

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
    });

    const otp = Math.floor(10000 + Math.random() * 90000);

    const mailData = {
    to: 'sabinhero88@gmail.com',
    subject: 'Sabin Mail Sender Alert',
    text: 'Hi, I am sending email. Your app is perfectly working'
    }
    transporter.sendMail(mailData, (err, info) => {
    if(err) {
        console.log('Error occured: ' + err);
        return;
    }
    console.log('Successful ' + info.response);
    return;
    })

}

module.exports = {login, registerCompany, registerUser, resetPassword}; 