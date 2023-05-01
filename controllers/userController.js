require('dotenv').config()
const jwt = require('jsonwebtoken');

const userModel = require('../models/userModel');
const companiesModel = require('../models/companiesModel');
const usrDetailsModel = require('../models/usrDetailsModel');
const meterReaderModel = require('../models/meterReaderModel');
const receiptModel = require('../models/receiptModel');
const issueModel = require('../models/issueModel');

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Cloudinary configuration 
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});




// CREATE ==========================================================================================================================
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

        // Save organization details to MongoDB
        await companiesModel.create({
            companyName, address, email1, fullName, email2, jobTitle, contactNum, paymentMethod, bankName, accountNum, billingCycle, paymentDueDate, estimatedWaterUsage, noOfMeters
        });

        res.status(201).json({ message: 'Successfully registered! You will be notified through email after approval.' });
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
            landOwnershipDoc: landOwnershipUrl
        });
        res.status(200).json({message: "Successfully registered! You will be notified through email after approval"});
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

        // get the company/reader/user full name
        let fullName = user.userId;

        if(user.userRole === 'companyConsumer') {
            findCompany = await companiesModel.findOne({ loginId: user._id });
            fullName = findCompany.companyName;
        } else if(user.userRole === 'individualConsumer') {
            findIndividual = await usrDetailsModel.findOne({ loginId: user._id });
            fullName = `${findIndividual.firstName}${findIndividual.middleName ? ' ' + findIndividual.middleName + ' ' : ' '}${findIndividual.lastName}`;

        } else if(user.userRole === 'reader') {
            findReader = await meterReaderModel.findOne({ loginId: user._id });
            fullName = findReader.fullName;
        }

        res.status(200).json({fullName, role: user.userRole, token});
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

const contactWavebilling = async (req, res) => {
    if(req.body == null) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { firstName, lastName, email, contactNum, queries } = req.body;
    if(!firstName || !lastName || !email || !contactNum || !queries) {
        return res.status(422).json({message: 'Please fill all the required fields'});
    }

    // Sen
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
    });

    const mailData = {
        to: 'wavebilling19@gmail.com',
        subject: `New query from ${firstName} ${lastName}`,
        text: `${queries}\n${email}\n${contactNum}`
    }
    transporter.sendMail(mailData, (err, info) => {
    if(err) {
        console.log('Error occured: ' + err);
        return res.status(500).json({message: 'Server error'});
    }
    console.log('Successful ' + info.response);
    return res.json({message: 'Your queries has been received'});
    })

}
const submitIssue = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    } 
    const { subject, issue } = req.body;
    if(!subject || !issue) {
        return res.status(422).json({message: 'Please fill all the required fields'});
    }
    const login_id = req.user.id;
    const username = req.user.userId;

    // Check if already made
    const alreadyExists = await issueModel.findOne({
        userName: username,
        subject,
    });
    if(alreadyExists) return res.status(409).json({ message: 'Issue has been already raised.' });

    if(req.user.userRole === 'reader') {
        const userDoc = await meterReaderModel.findOne({loginId: login_id});
        const userFullName = userDoc.fullName;
        const phoneNum = userDoc.contactNum;        
        // Add to issue collection
        await issueModel.create({
            name: userFullName,
            userName: username,
            phoneNum,
            subject,
            issue
        });
        res.json({ message: 'Successfully raised issue with subject: ' + subject });

    } else if(req.user.userRole === 'companyConsumer') {
        const userDoc = await companiesModel.findOne({loginId: login_id});
        const userFullName = userDoc.companyName;
        const phoneNum = userDoc.contactNum;        
        // Add to issue collection
        await issueModel.create({
            name: userFullName,
            userName: username,
            phoneNum,
            subject,
            issue
        });
        res.json({ message: 'Successfully raised issue with subject: ' + subject });

    } else if(req.user.userRole === 'individualConsumer') {
        const userDoc = await usrDetailsModel.findOne({loginId: login_id});
        const userFullName = userDoc.middleName?`${userDoc.firstName} ${userDoc.middleName} ${userDoc.lastName}`: `${userDoc.firstName} ${userDoc.lastName}`;
        const phoneNum = userDoc.tel2;        
        // Add to issue collection
        await issueModel.create({
            name: userFullName,
            userName: username,
            phoneNum,
            subject,
            issue
        });
        res.json({ message: 'Successfully raised issue with subject: ' + subject });

    }
}



// READ ==========================================================================================================================
const fetchMyBills = async (req, res) => {
    console.log(req.user);
    const { userRole, id } = req.user;
    let userDoc;
    if(userRole == 'individualConsumer') {
        userDoc = await usrDetailsModel.findOne({
            loginId: id
        });
    }
    else if(userRole == 'companyConsumer') {
        userDoc = await companiesModel.findOne({
            loginId: id
        });
    } else {
        return res.status(404).json({ message: 'You don\'t have permission for this operation'});
    }
    res.json(await receiptModel.find({
        consumerId: userDoc._id
    }));
}

module.exports = { login, registerCompany, registerUser, resetPassword, contactWavebilling, submitIssue, fetchMyBills }; 