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
const adminDetailsModel = require('../models/adminDetailsModel');
const otpModel = require('../models/otpModel');
const notificationModel = require('../models/notificationModel');

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

const sendOtp = async (req, res) => {
    let { userName, email } = req.body;

    if(!userName && !email) {
        return res.status(422).json({ message: 'userName or email is required' });
    }

    async function isValidEmail() {
        userDoc = await usrDetailsModel.findOne({
            email
        });
        if(userDoc) return true;

        userDoc = await companiesModel.findOne({
            email1: email
        });
        if(userDoc) return true;

        userDoc = await meterReaderModel.findOne({
            email
        });
        if(userDoc) return true;

        userDoc = await adminDetailsModel.findOne({
            email
        });
        if(userDoc) return true;

        return false;
    }
    
    // If api is called by passing userName
    if(userName) {
        // Find the login doc of the user in users collection
        const loginDoc = await userModel.findOne({ userId: userName });
        if(!loginDoc) return res.status(404).json({ message: 'No user with such username' });
        
        // Find the email of the user
        if(loginDoc.userRole == "individualConsumer"){
            const userDoc = await usrDetailsModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email;

        } else if(loginDoc.userRole == "companyConsumer"){
            const userDoc = await companiesModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email1;

        } else if(loginDoc.userRole == "reader") {
            const userDoc = await meterReaderModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email;

        } else {
            const userDoc = await adminDetailsModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email;

        }
        
        if(!email) return res.status(404).json({ message: 'No email found' });

    } else {        
        let isValidEmail = await isValidEmail();
        if(!isValidEmail) return res.status(422).json({ message: 'No user with such email' });
        
    }

    // Check if otp is already sent
    const alreadySent = await otpModel.findOne({
        email,
    });

    if(alreadySent) {
        const currentTimestamp = new Date().getTime();
        const otpExpiration = alreadySent.otpExpiration.getTime();
        console.log(currentTimestamp);
        console.log(otpExpiration);
        console.log(currentTimestamp <= otpExpiration);
        if(currentTimestamp <= otpExpiration) return res.status(400).json({ message: 'OTP has been sent already. Please wait 1 minute before requesting new OTP' })
    }

    // Create the otp
    const otp = {
        email,
        otpPin: Math.floor(10000 + Math.random() * 90000),
        otpExpiration: (new Date().getTime()) + (1 * 60 * 1000)
    }

    // Add otp to database
    await otpModel.create(otp);

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
    });

    

    const mailData = {
        to: email,
        subject: 'WaveBilling Password Reset OTP',
        text: 'Please use this OTP(One Time Password) to reset your password.\n Your OTP is: ' + otp.otpPin
    }
    transporter.sendMail(mailData, (err, info) => {
        if(err) {
            console.log('Error occurred: ' + err);
            res.status(500).json({ message: 'OTP sending failed: ' + err })
            return;
        }
        console.log('Successful ' + info.response);
        return res.json({ message: 'OTP has been sent successfully.' });
    })

}

const verifyOtp = async (req, res) => {
    const { otp, newPassword, userRole } = req.body;
    let { userName, email } = req.body;
    if(!userName && !email) return res.status(422).json({ message: 'Either userName or email is required'});
    if(!otp || !newPassword) return res.status(422).json({ message: 'Please fill all the fields' });
    let loginDoc;
    let userDoc;

    async function isValidEmail() {
        userDoc = await usrDetailsModel.findOne({
            email
        });
        if(userDoc) return true;

        userDoc = await companiesModel.findOne({
            email1: email
        });
        if(userDoc) return true;

        userDoc = await meterReaderModel.findOne({
            email
        });
        if(userDoc) return true;

        userDoc = await adminDetailsModel.findOne({
            email
        });
        if(userDoc) return true;

        return false;
    }

    // if verify-otp is done by passing userName 
    if(userName) {
        // Find the login doc of the user in users collection
        loginDoc = await userModel.findOne({ userId: userName });
        if(!loginDoc) return res.status(404).json({ message: 'No user with such username' });
        
        // Find the email of the user
        if(loginDoc.userRole == "individualConsumer"){
            userDoc = await usrDetailsModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email;

        } else if(loginDoc.userRole == "companyConsumer"){
            userDoc = await companiesModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email1;

        } else if(loginDoc.userRole == "reader") {
            userDoc = await meterReaderModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email;

        } else {
            userDoc = await adminDetailsModel.findOne({
                loginId: loginDoc._id
            });
            if(!userDoc) return res.status(404).json({ message: 'No user doc found' });

            email = userDoc.email;

        }
        if(!email) return res.status(404).json({ message: 'No email found' });

    } else {
        let isValidEmail = await isValidEmail();
        if(!isValidEmail) res.status(422).json({ message: 'No user with such email' });
    }

    // Find the otp in database
    const findOtp = await otpModel.findOne({
        email,
        otpPin: otp
    });
    // If no such otp is found in database
    if(!findOtp) return res.status(422).json({ message: 'Invalid OTP' });
    
    const currentTimestamp = new Date().getTime();
    // If otp is expired
    if(currentTimestamp > findOtp.otpExpiration.getTime()) return res.status(422).json({ message: 'OTP expired' });

    // Find the login doc
    const loginId = userDoc.loginId;

    // Find the login document
    loginDoc = await userModel.findById(loginId);
    if(!loginDoc) return res.status(404).json({ message: 'No login details found' });

    // Change the password of that login document
    loginDoc.password = await bcrypt.hash(newPassword, 10);
    loginDoc.save();

    res.json({ message: 'Successfully changed the password.' });
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
        console.log('Error occurred: ' + err);
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

        // Add notification to the admin
        const adminList = await userModel.find({ userRole: 'admin' });
        await Promise.all(adminList.map(async (admin) => {
            const userId = admin.userId;
            await notificationModel.create({
                userId,
                date: new Date(),
                body: `New Issue raised by ${userFullName}.`
            })
        }));
        
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

        // Add notification to the admin
        const adminList = await userModel.find({ userRole: 'admin' });
        await Promise.all(adminList.map(async (admin) => {
            const userId = admin.userId;
            await notificationModel.create({
                userId,
                date: new Date(),
                body: `New Issue raised by ${userFullName}.`
            })
        }));

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
    
    const resData = await Promise.all(myBills.filter(bill => !bill.paid).map(async (bill) => {
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

const fetchReceiptDetails = async (req, res) => {
    const { receiptId } = req.query;
    try {
        res.json(await receiptModel.findById(receiptId));    
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

    const { _id } = req.query;
    if(!_id) {
        return res.status(422).json({ message: '_id is required' });
    }
    const bill = await billModel.findById(_id);
    if(!bill) {
        res.status(404).json({ message: 'bill not found' });
    }
    const consumerDetails = {
        consumerName,
        consumerAddress,
        userId
    }

    const { billDate, billAmount } = bill;
        const dueDate = new Date(billDate);
        const dueBy = new Date(dueDate.setDate(billDate.getDate() + 10))
        const { finePercent, rebatePercent, rebateAmount, fineAmount, totalAmount } = calculateRebateAndFine(billDate, dueBy, billAmount);

    res.json({
        _id: bill._id,
        ...consumerDetails,
        billDate,
        dueBy,
        unitConsumed: bill.currentReading - bill.previousReading,
        billAmount,
        finePercent,
        rebatePercent,
        rebateAmount,
        fineAmount,
        totalAmount
    });
}

const fetchTotalPayment = async (req, res) => {
    const userId = req.user.userId;
    const myReceipts = await receiptModel.find({
        consumerId: userId
    });
    let totalPayment = 0;
    myReceipts.map((receipt) => {
        totalPayment += receipt.totalAmount
    });
    res.json({ totalPayment });
}

const myAdvancePayment = async (req, res) => {
    const userId = req.user.userId;
    const advancePayment = await advancePaymentModel.findOne({
        consumerId: userId
    })
    res.json({ advanceAmount: advancePayment?advancePayment.advanceAmount:0 });
}

const fetchProfileInfo = async (req, res) => {
    const { userRole, id } = req.user;
    try {
            if(userRole == 'individualConsumer') {
            const userDoc = await usrDetailsModel.findOne({
                loginId: id
            });
            if(!userDoc) {
                return res.status(404).json({ message: 'User not found' });
            }
            const { firstName, middleName, lastName, tel2, email } = userDoc;
            res.json({
                firstName,
                middleName,
                lastName,
                tel2,
                email
            });
        } else if(userRole == 'companyConsumer') {
            const userDoc = await companiesModel.findOne({
                loginId: id
            });
            if(!userDoc) {
                return res.status(404).json({ message: 'User not found' });
            }
            const { companyName, contactNum, email1 } = userDoc;
            res.json({
                companyName,
                contactNum,
                email1
            });
        } else {
            return res.status(401).json({ message: 'You are unauthorized to perform this action' })
        }
    } catch(err) {
        return res.status(500).json({ error: 'Server error: ' + err });
    }
    
}

const getNotificationCount = async (req, res) => {
    const { userId } = req.user;
    try {
        const arr = await notificationModel.find({ userId, seen: false });
        const count = arr.length;
        res.json({ count });
    } catch (err) {
        res.status(500).json( { message: 'Error occurred ' + err });
    }
}

const getNotifications = async (req, res) => {
    const { userId } = req.user;
    try {
        // Find all notifications
        const notifications = await notificationModel.find({ userId }).sort({ date: -1 });
        
        // Update the unseen notifications to seen
        await notificationModel.updateMany(
            { userId, seen: false },
            { $set: { seen: true } }
        );

        res.json({ notifications });
    } catch (err) {
        res.status(500).json( { message: 'Error occurred ' + err });
    }
}



// UPDATE ==========================================================================================================================
const editProfileInfo = async (req, res) => {
    const { userRole, id, userId } = req.user;
    const { currPassword, newPassword } = req.body;
    if(currPassword) {
        if(!newPassword) return res.status(422).json({ message: 'New password is required.' });
        const userLogin = await userModel.findOne({ userId });
        const isMatch = await bcrypt.compare(currPassword, userLogin.password);
        if(!isMatch) return res.status(400).json({ message: 'Current password is incorrect'});
        userLogin.password = await bcrypt.hash(newPassword, 10);
        await userLogin.save();
    }

    if(userRole == 'individualConsumer') {
        const { firstName, middleName, lastName, tel2, email } = req.body;
        if(!firstName ||!middleName ||!lastName ||!tel2 ||!email) {
            return res.status(422).json({ message: 'Please fill all the fields' });
        }
        // Find the user document
        const userDoc = await usrDetailsModel.findOne({
            loginId: id
        });
        if(!userDoc) return res.status(404).json({ message: 'User not found' });

        // Edit the user doc
        userDoc.firstName = firstName;
        userDoc.middleName = middleName;
        userDoc.lastName = lastName;
        userDoc.tel2 = tel2;
        userDoc.email = email;
        await userDoc.save();

        // Update the details in issues associated with user
        await issueModel.updateMany({ userName: userId }, {
            $set: {
                name: middleName?`${firstName} ${middleName} ${lastName}`: `${firstName} ${lastName}`,
                phoneNum: tel2
            }
        });

        // Update the details in receipts associated with the user
        await receiptModel.updateMany({ consumerId: userId }, {
            $set: {
                consumerName: middleName?`${firstName} ${middleName} ${lastName}`: `${firstName} ${lastName}`
            }
        })

        res.json({ message: 'Successful' });
    } else if(userRole == 'companyConsumer') {
        const { companyName, contactNum, email1 } = req.body;
        if(!companyName||!contactNum ||!email1) {
            return res.status(422).json({ message: 'Please fill all the fields' });
        }
        // Find the user document
        const userDoc = await companiesModel.findOne({
            loginId: id
        });
        if(!userDoc) return res.status(404).json({ message: 'User not found' });

        // Edit the user doc
        userDoc.companyName = companyName;
        userDoc.contactNum = contactNum;
        userDoc.email1 = email1;
        await userDoc.save();

        // Update the details in issues associated with the user
        await issueModel.updateMany({ userName: userId }, {
            $set: {
                name: companyName,
                phoneNum: contactNum
            }
        });

        // Update the details in receipts associated with the user
        await receiptModel.updateMany({ consumerId: userId }, {
            $set: {
                consumerName: companyName
            }
        })

        res.json({ message: 'Successful' });
    } else {
        return res.status(401).json({ message: 'You are unauthorized to perform this action' });
    }
}

module.exports = { login, registerCompany, registerUser, sendOtp, contactWavebilling, submitIssue, fetchMyBills, payBill, fetchMyReceipts, fetchReport, fetchBillDetails, fetchTotalPayment, myAdvancePayment, fetchProfileInfo, editProfileInfo, verifyOtp, fetchReceiptDetails, getNotificationCount, getNotifications }; 