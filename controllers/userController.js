require('dotenv').config()
const jwt = require('jsonwebtoken');

const userModel = require('../models/userModel');
const companiesModel = require('../models/companiesModel');
const usrDetailsModel = require('../models/usrDetailsModel');
const meterReaderModel = require('../models/meterReaderModel');
const billModel = require('../models/billModel');
const issueModel = require('../models/issueModel');
const advancePaymentModel = require('../models/advancePaymentModel');
const receiptModel = require('../models/receiptModel');

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Cloudinary configuration 
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



function calculateRebateAndFine(billDate, dueBy, billAmount) {
    const billTimestamp = new Date(billDate).getTime(); // Get timestamp of bill date
    const dueByTimestamp = new Date(dueBy).getTime(); // Get timestamp of due by date
    const currentDateTimestamp = Date.now(); // Get timestamp of current date
    const daysSinceDueBy = Math.floor((currentDateTimestamp - dueByTimestamp) / (1000 * 60 * 60 * 24)); // Calculate number of days past due by date
    const daysSinceBill = Math.floor((currentDateTimestamp - billTimestamp) / (1000 * 60 * 60 * 24)); // Calculate number of days since bill date
    let rebatePercent = 0;
    let finePercent = 0;

    if (daysSinceBill <= 2) {
        rebatePercent = 10;
    } else if (daysSinceBill <= 5) {
        rebatePercent = 5;
    }

    if (daysSinceDueBy > 20) {
        finePercent = 100;
    } else if (daysSinceDueBy > 15) {
        finePercent = 20;
    } else if (daysSinceDueBy > 12) {
        finePercent = 15;
    } else if (daysSinceDueBy > 10) {
        finePercent = 10;
    }

    const rebateAmount = billAmount * (rebatePercent / 100);
    const fineAmount = billAmount * (finePercent / 100);
    const totalAmount = billAmount - rebateAmount + fineAmount;

    return {
        rebatePercent,
        finePercent,
        rebateAmount,
        fineAmount,
        totalAmount
    };
}
  




// CREATE ==========================================================================================================================
const payBill = async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'No data found in the request body.' });
    }
    const { billId, advancePayment, paymentMode } = req.body;
    if(!billId) {
        return res.status(400).json({ error: 'The billId is missing from the request body.' });
    } else if(!paymentMode) {
        return res.status(400).json({ error: 'The paymentMode is missing from the request body.' });
    }

    const { userRole, id } = req.user;
    const userId = req.user.userId;
    let userDoc;
    let consumerName, consumerAddress, meterNo;
    if(userRole == 'individualConsumer') {
        userDoc = await usrDetailsModel.findOne({
            loginId: id
        });
        if(userDoc) {
            const { firstName, middleName, lastName, tole, municipality, wardNo, province  } = userDoc;
            meterNo = userDoc.meterNo;
            consumerName = middleName?`${firstName} ${middleName} ${lastName}`:`${firstName} ${lastName}`;
            consumerAddress = `${tole}, ${municipality}-${wardNo} ${province}`;
        } else {
            return;
        }
    }
    else if(userRole == 'companyConsumer') {
        userDoc = await companiesModel.findOne({
            loginId: id
        });
        if(userDoc) {
            const { companyName, address  } = userDoc;
            meterNo = userDoc.meterNo;
            consumerName = companyName;
            consumerAddress = address;
        } else {
            return;
        }
    } else {
        return res.status(404).json({ message: 'You don\'t have permission for this operation'});
    }

    // Check if there is advance payment and it is a number
    if(advancePayment) {
        if(isNaN(advancePayment)) {
            return res.status(400).json({ error: 'Advance payment should be a number.'} );
        }
    }

    try {
        // Find the bill of the consumer
        const bill = await billModel.findById(billId);
        if(!bill) {
            return res.status(404).json({ error: 'Bill not found.' });
        } else if(bill.paid) {
            return res.status(400).json({ error: 'Bill has already been paid.' });
        }

        // Change the paid status in bill and save it to database
        bill.paid = true;
        await bill.save();

        const { billDate } = bill;
        let { billAmount } = bill;
        const dueDate = new Date(billDate);
        const dueBy = new Date(dueDate.setDate(billDate.getDate() + 10))
        let { finePercent, rebatePercent, rebateAmount, fineAmount, totalAmount } = calculateRebateAndFine(billDate, dueBy, billAmount);
        let finalAmount = totalAmount;

        let hasAdvance = await advancePaymentModel.findOne({
            consumerId: userId
        });
        const previousAdvanceAmount = hasAdvance?hasAdvance.advanceAmount:0;

        // If customer has paid advance before
        if(hasAdvance) {
            if(finalAmount >= hasAdvance.advanceAmount) {
                finalAmount -= hasAdvance.advanceAmount;
                hasAdvance.advanceAmount = 0;
                await hasAdvance.save();
            } else {
                finalAmount = 0;
                hasAdvance.advanceAmount -= finalAmount;
                await hasAdvance.save();
            }
        }

        // If advance payment is also made, add it to database
        if(advancePayment) {
            const myAdvance = await advancePaymentModel.findOne({
                consumerId: userId
            });

            if(myAdvance) {
                myAdvance.advanceAmount += Number(advancePayment);
                myAdvance.save();
            } else{
                await advancePaymentModel.create({
                    paymentDate: new Date(),
                    consumerId: userId,
                    advanceAmount: Number(advancePayment)
                });
            }
        }

        const receipt = await receiptModel.create({
            billId: bill._id,
            paymentDate: new Date(),
            consumerName,
            consumerId: userId,
            consumerAddress,
            meterNo,
            billAmount: billAmount,
            finePercent,
            rebatePercent,
            rebateAmount,
            fineAmount,
            totalAmount,
            previousAdvanceAmount,
            finalAmount,
            paymentMode
        });
        return res.json(receipt);

    } catch(err) {
        return res.status(500).json({ error: err.message });
    }
}
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
    const { userRole, id } = req.user;
    const userId = req.user.userId;
    let userDoc;
    let consumerName, consumerAddress;
    if(userRole == 'individualConsumer') {
        userDoc = await usrDetailsModel.findOne({
            loginId: id
        });
        if(userDoc) {
            const { firstName, middleName, lastName, tole, municipality, wardNo, province  } = userDoc;
            consumerName = middleName?`${firstName} ${middleName} ${lastName}`:`${firstName} ${lastName}`;
            consumerAddress = `${tole}, ${municipality}-${wardNo} ${province}`;
        } else {
            return;
        }
    }
    else if(userRole == 'companyConsumer') {
        userDoc = await companiesModel.findOne({
            loginId: id
        });
        if(userDoc) {
            const { companyName, address  } = userDoc;
            consumerName = companyName;
            consumerAddress = address;
        } else {
            return;
        }
    } else {
        return res.status(404).json({ message: 'You don\'t have permission for this operation'});
    }

    const myBills = await billModel.find({
        consumerId: userDoc._id
    })

    const consumerDetails = {
        consumerName,
        consumerAddress,
        userId
    }

    if(!myBills) {
        res.status(404).json({ message: 'no bill found' });
    }
    
    const resData = await Promise.all(myBills.map(async (bill) => {
        const { billDate, billAmount } = bill;
        const dueDate = new Date(billDate);
        const dueBy = new Date(dueDate.setDate(billDate.getDate() + 10))
        const { finePercent, rebatePercent, rebateAmount, fineAmount, totalAmount } = calculateRebateAndFine(billDate, dueBy, billAmount);
        return ({
            _id: bill._id,
            ...consumerDetails,
            billDate,
            dueBy,
            billAmount,
            finePercent,
            rebatePercent,
            rebateAmount,
            fineAmount,
            totalAmount
        })
    }))

    res.json(resData);
}

const fetchMyReceipts = async (req, res) => {
    const userId = req.user.userId;
    try {
        res.json(await receiptModel.find({
            consumerId: userId
        }));    
    } catch(err) {
        res.status(500).json({message: "Server error"});
    }
}

const fetchReport = async (req, res) => {
    const { id, userRole } = req.user;
    try {
        let userDoc;
        if(userRole == 'companyConsumer') {
            userDoc = await companiesModel.findOne({
                loginId: id
            })
        } else if (userRole == 'individualConsumer') {
            userDoc = await usrDetailsModel.findOne({
                loginId: id
            })
        } else {
            return res.status(401).json({ message: 'You are unauthorized to perform this action' })
        }
        const consumerId = userDoc._id;
        const myBills = await billModel.find({
            consumerId
        });
        const report = myBills.map((bill) => {
            return ({
                year: bill.billDate.getFullYear(),
                month: bill.billDate.getMonth(),
                units: bill.currentReading - bill.previousReading
            })
        })
        res.json(report);
    } catch(err) {
        res.status(500).json({ message: 'Error occurred: ' + err });
    }
}

const fetchBillDetails = async (req, res) => {
    const { _id } = req.params;
    if(!_id) {
        return res.status(422).json({ message: '_id is required' });
    }
    res.json(await billModel.findById(_id));
}

module.exports = { login, registerCompany, registerUser, resetPassword, contactWavebilling, submitIssue, fetchMyBills, payBill, fetchMyReceipts, fetchReport, fetchBillDetails }; 