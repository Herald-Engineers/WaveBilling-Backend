require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const meterReaderModel = require('../models/meterReaderModel');
const usrDetailsModel = require('../models/usrDetailsModel');
const billModel = require('../models/billModel');
const scheduleModel = require('../models/scheduleModel');
const companiesModel = require('../models/companiesModel');
const meterModel = require('../models/meterModel');
const issueModel = require('../models/issueModel');
const receiptModel = require('../models/receiptModel');
const advancePaymentModel = require('../models/advancePaymentModel');

const bcrypt = require('bcrypt');
// Cloudinary configuration 
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});




// HELPER =============================================================================================================
const generateMeterNo = async () => {
    const min = 10000; // Minimum 5-digit number
    const max = 99999; // Maximum 5-digit number
    let meterNo;
    do {
        meterNo = Math.floor(Math.random() * (max - min + 1) + min); // Generate random number
    } while (await meterModel.findOne({ meterNo: meterNo.toString() })) // Check if number already exists in collection
    return meterNo;
}




// CREATE =============================================================================================================
const addReader = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { fullName, readerId, password, email, contactNum } = req.body;
    if(!fullName || !readerId || !password || !email || !contactNum) {
        return res.status(422).json({message: 'Please fill all the fields'});
    }

    // If reader already exists
    const alreadyExists = await userModel.findOne({ userId: readerId });

    if(alreadyExists) {
        return res.status(409).json({message: 'Reader with same id already exists'});
    }

    // Adding reader to users list for login
    const hashedPassword = await bcrypt.hash(password, 10);
    const newReader = await userModel.create({
        userId: readerId,
        password: hashedPassword,
        userRole: 'reader'
    })

    // Adding user to meterReaders list
    await meterReaderModel.create({
        fullName,
        email,
        contactNum,
        loginId: newReader._id
    });
    res.status(201).json({message: 'Meter Reader Successfully added'});
}
const addSchedule = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { address1, address2, address3, address4, address5, date, shift, readerId } = req.body;
    if(!address1) {
        return res.status(422).json({message: 'Address 1 should not be null'});
    }
    if(!date || !shift || !readerId) {
        return res.status(422).json({message: 'Please fill out all the required fields.'});
    }
    try {
        const findReader = await meterReaderModel.findById(readerId);
        if(!findReader) {
            return res.status(404).json({message: 'No such meter reader.'});
        }
        await scheduleModel.create({
            address1,
            address2,
            address3,
            address4,
            address5,
            date,
            shift,
            assignedTo: findReader.fullName,
            readerId: findReader._id
        })
        res.status(201).json({message: 'Scheduled successfully.'});
    } catch(err) {
        console.log(err);
        res.status(500).json({message: 'Server error'});
    }


}




// READ =============================================================================================================
const fetchReaders = async (req, res) => {
    try {
        const readers = await meterReaderModel.find();
        res.json(readers);
    } catch(err) {
        res.status(500).json({ message: 'Server error: ' + err });
    }
}
const fetchUsername = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const loginId = req.body.loginId;
    try {
        const findLogin = await userModel.findById(loginId);
        res.json({userId: findLogin.userId});
    } catch(err) {
        console.log(err);
        res.status(500).json({message: 'Login id error'});
    }
}
const fetchSchedules = async (req, res) => {
    const schedules = await scheduleModel.find();
    res.json(schedules);
}

const fetchConsumers = async (req, res) => {
    const individuals = await usrDetailsModel.find();
    const companies = await companiesModel.find();

    // console.log(individuals);
    const individualsDetails = await Promise.all(individuals.map(async (individual) => {
        const {
            _id,
            firstName,
            middleName,
            lastName,
            meterNo,
            tel2,
            email,
            tole,
            wardNo,
            municipality,
            approvedStatus,
            loginId
        } = individual;

        let userId = '-';
        if (loginId) {
            const user = await userModel.findById(loginId);
            userId = user ? user.userId : "-";
        }
        let paymentStatus = '-';
        
        // Setting payment status
        if(approvedStatus) {
            const notPaid = await billModel.findOne({ consumerId: _id, paid: false });
            if(notPaid) {
                paymentStatus = false
            } else {
                paymentStatus = true
            };
        }

        return ({
            _id,
            fullName: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
            userId,
            meterNo,
            contactNum: tel2,
            email,
            address: `${municipality}-${wardNo}, ${tole}`,
            consumerType: 'Individual',
            paymentStatus,
            approvedStatus
        })
    }))

    const companiesDetails = await Promise.all(companies.map(async (company) => {
        const { _id, companyName, meterNo, contactNum, email1, address, approvedStatus, loginId } = company;
        let userId = '-';
        if(loginId) {
            const user = await userModel.findById(loginId);
            userId = user ? user.userId : "-";
        }
        let paymentStatus = '-';
        
        // Setting payment status
        if(approvedStatus) {
            const notPaid = await billModel.findOne({ consumerId: _id, paid: false });
            if(notPaid) {
                paymentStatus = false
            } else {
                paymentStatus = true
            };
        }

        return ({
            _id,
            fullName: companyName,
            userId,
            meterNo,
            contactNum: contactNum,
            email: email1,
            address,
            consumerType: 'Company',
            paymentStatus,
            approvedStatus
        })
    }));
    const result = individualsDetails.concat(companiesDetails);
    res.json(result);
}

const fetchIssues = async (req, res) => {
    res.json(await issueModel.find());
}

const fetchConsumerDetails = async (req, res) => {
    const { userDocId, consumerType } = req.query;
    if(!userDocId || !consumerType) return res.status(422).json({ message: 'userDocId and consumerType is required' });
    let userDoc;
    if(consumerType == 'Individual') {
        userDoc = await usrDetailsModel.findOne({
            _id:  userDocId
        });
        const { firstName, lastName, middleName, houseNo, province, municipality, wardNo, tole, tel1, tel2, email } = userDoc;
        res.json({
            userType: consumerType,
            firstName,
            lastName,
            middleName,
            houseNo,
            province,
            municipality,
            wardNo,
            tole,
            tel1,
            tel2,
            email
        });
    } 
    else if(consumerType == 'Company') {
        userDoc = await companiesModel.findOne({
            _id: userDocId
        });
        const { companyName, address, email, contactNum } = userDoc;
        res.json({
            userType: consumerType,
            companyName,
            address,
            email,
            contactNum
        })
    } else {
        res.status(401).json({ message: 'No such user type is allowed' });
    }
}


// UPDATE =============================================================================================================
const editReader = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { _id, fullName, readerId, contactNum, email } = req.body;
    if(!_id) {
        return res.status(422).json({message: '_id was not provided'});
    }
    if(!fullName || !readerId || !contactNum || !email ) {
        return res.status(422).json({message: 'Fields cannot be left empty'});
    }

    // Check if the readerModel _id exists
    const readerExists = await meterReaderModel.findById(_id);

    if(!readerExists) return res.status(404).json({message: 'The meter reader with provided _id doesn\'t exist'});

    // Check if readerId in userModel already exists
    const userIdExists = await userModel.find({ userId: readerId });
    
    if(userIdExists.length > 0) {
        if(userIdExists.length == 1 && userIdExists[0]._id.toString() === readerExists.loginId.toString()) {
        } else {
            return res.status(409).json({message: 'userId already taken'});
        }
    }

    const readerFilter = { _id };
    const readerUpdate = {
        $set: {
          fullName,
          contactNum,
          email
        }
    };

    const userFilter = {
        _id: readerExists.loginId
    }
    const userUpdate = {
        $set: {
            userId: readerId
        }
    }

    await meterReaderModel.updateOne(readerFilter, readerUpdate);
    await userModel.updateOne(userFilter, userUpdate);
    res.json({message: 'Reader updated successfully'});
}
const approveUser = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { _id, userType } = req.body;
    if(!_id || !userType) {
        return res.status(422).json({message: 'Please fill all the require fields'});
    }
    
    if(userType === 'Individual') {
        try{
            const userExists = await usrDetailsModel.findOne({
                _id
            });
            if(!userExists) return res.status(404).json({message: 'Individual not found'});
            
            const alreadyApproved = await usrDetailsModel.findOne({
                _id,
                approvedStatus: true 
            });
            if(alreadyApproved) return res.status(409).json({message: 'User already approved'});

            const meterNo = (await generateMeterNo()).toString();
            await usrDetailsModel.updateOne(
                { _id },
                { $set: { meterNo, approvedStatus: true } }
            );
        
            let username;
            do {
                username = 'usr' + Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit number
            } while (await userModel.findOne({ userId: username })); // Check if the username already exists in the database
            const password = 'user123'
    
            // Create login credentials in database
            const loginDoc = await userModel.create({
                userId: username,
                password: await bcrypt.hash(password, 10),
                userRole: 'individualConsumer'
            });

            await usrDetailsModel.updateOne(
                { _id },
                { $set: { loginId: loginDoc._id } }
            );

            // add to meterlist database
            await meterModel.create({
                meterNo,
                username
            });

            return res.json({message: `Approve successful username: ${username} password: ${password}`});
        }
        catch(err) {
            console.log('Caught error: ' + err);
            res.status(500).json({message: 'Error occurred ' + err});
        }

    }
    else if(userType === 'Company') {
        try {
            const userExists = await companiesModel.findOne({
                _id
            });
            if(!userExists) return res.status(404).json({message: 'Company not found'});

            const alreadyApproved = await companiesModel.findOne({
                _id,
                approvedStatus: true 
            })
            if(alreadyApproved) return res.status(409).json({message: 'User already approved'});

            const companyDoc = await companiesModel.findById(_id);
            const requiredMeters = Number(companyDoc.noOfMeters);

            const meterNumbers = [];
            for(let i=0; i<requiredMeters; i++) {
                let randomMeterNumber = (await generateMeterNo()).toString();;
                while (meterNumbers.includes(randomMeterNumber)) {
                    randomMeterNumber = (await generateMeterNo()).toString();
                }
                meterNumbers.push(randomMeterNumber);
            }

            // update the approve status and meter number in usrDetails
            const meterNo = meterNumbers.join(', ');
            await companiesModel.updateOne(
                { _id },
                { $set: { meterNo, approvedStatus: true } }
            );

            let username;
            do {
                username = 'com' + Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit number
            } while (await userModel.findOne({ userId: username })); // Check if the username already exists in the database

            const password = 'company123';

            const loginDoc = await userModel.create({
                userId: username,
                password: await bcrypt.hash(password, 10),
                userRole: 'companyConsumer'
            });

            await companiesModel.updateOne(
                { _id },
                { $set: { loginId: loginDoc._id } }
            );

            // add to meterlist database
            for(let i=0; i<requiredMeters; i++) {
                await meterModel.create({
                    meterNo: meterNumbers[i],
                    username
                });
            }
            
            return res.json({message: `Approve successful username: ${username} password: ${password}`});
        } catch (err) {
            console.log('Caught error: ' + err);
            res.status(500).json({message: 'Error occurred ' + err});
        }
    }
}
const editUser = async (req, res) => {
    const { userType, id  } = req.body;
    if(!userType || !id) return res.status(422).json({ message: 'userType and id are required.'});
    const { firstName, middleName, lastName, houseNo, province, municipality, wardNo, tole, tel2, email  } = req.body;
    const { companyName, address, email1, contactNum } = req.body;

    if(userType == 'Individual') {
        if(!firstName || !lastName || !houseNo || !province || !municipality || !wardNo || !tole || !tel2 || !email) {
            return res.status(422).json({ message: 'Please fill all the fields' });
        }
        // Find the user document
        const userDoc = await usrDetailsModel.findById(id);
        if(!userDoc) return res.status(404).json({ message: 'User not found' });

        // Edit the user doc
        userDoc.firstName = firstName;
        userDoc.middleName = middleName;
        userDoc.lastName = lastName;
        userDoc.houseNo = houseNo;
        userDoc.province = province;
        userDoc.municipality = municipality;
        userDoc.wardNo = wardNo;
        userDoc.tole = tole;
        userDoc.tel1 = tel1;
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
                consumerName: middleName?`${firstName} ${middleName} ${lastName}`: `${firstName} ${lastName}`,
                consumerAddress: `${tole}, ${municipality}-${wardNo} ${province}`
            }
        })

        res.json({ message: 'Successful' });
    } else if(userType == 'Company') {
        if(!companyName ||!address ||!email1 ||!contactNum) {
            return res.status(422).json({ message: 'Please fill all the fields' });
        }

        // Find the user document
        const userDoc = await companiesModel.findById(id);
        if(!userDoc) return res.status(404).json({ message: 'User not found' });

        // Edit the user doc
        userDoc.companyName = companyName;
        userDoc.address = address;
        userDoc.contactNum = contactNum;
        userDoc.email1 = email1;
        await userDoc.save();

        // Update the details in issues associated with user
        await issueModel.updateMany({ userName: userId }, {
            $set: {
                name: companyName,
                phoneNum: contactNum
            }
        });

        // Update the details in receipts associated with the user
        await receiptModel.updateMany({ consumerId: userId }, {
            $set: {
                consumerName: companyName,
                consumerAddress: address
            }
        })

        res.json({ message: 'Successful' });
    } else {
        res.status(422).json({ message: 'No such user type' });
    }
}




// DELETE =============================================================================================================
const deleteReader = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { _id } = req.body;

    if(!_id) {
        return res.status(422).json({message: '_id is null'});
    }

    // Find the reader with requested id
    const reqReader = await meterReaderModel.findById(_id);

    // If reader does not exist
    if(!reqReader) {
        return res.status(404).json({message: 'No reader found with such id'});
    }

    // Delete the reader's login details
    const userLogin = await userModel.findByIdAndDelete(reqReader.loginId);

    // Delete the schedules associated with the reader
    await scheduleModel.deleteMany({ assignedTo: userLogin.userId });

    // Delete the reader details
    await meterReaderModel.findByIdAndDelete(_id);

    res.status(204).end();
}
const deleteUser = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { _id, userType } = req.body;
    if(!_id) {
        return res.status(422).json({message: '_id is null'});
    }
    if(!userType) {
        return res.status(422).json({message: 'userType is null'});
    }

    if(userType == 'Individual') {
        // Get the document of the user in usrDetails
        const userDoc = await usrDetailsModel.findById(_id);
        if(!userDoc) {
            return res.status(404).json({message: 'User not found.'});
        } else if(!userDoc.approvedStatus) {
            return res.status(404).json({message: 'User not approved yet'});
        }

        // Delete the submitted documents from cloudinary
        await cloudinary.uploader.destroy(`GuestUserDocs/${userDoc.citizenshipNo}`, function(error, result) {
            console.log(result);
        });
        await cloudinary.uploader.destroy(`GuestUserDocs/${userDoc.houseNo}_${userDoc.citizenshipNo}`, function(error, result) {
            console.log(result);
        });

        // Delete the bill of that user
        await billModel.deleteMany({ consumerId: _id });
        
        // Get the document of the user in users
        const userLogin = await userModel.findById(userDoc.loginId);

        // Delete the receipts of the user
        await receiptModel.deleteMany({ consumerId: userLogin.userId });

        // Delete the advance payment records of that user
        await advancePaymentModel.deleteMany({ consumerId: userLogin.userId });

        // Delete the issues created by the user
        await issueModel.deleteMany({ userName: userLogin.userId });
        
        // Delete the meter associated with that user
        await meterModel.deleteMany({ username: userLogin.userId });

        // Delete the receipts of the user
        await receiptModel.deleteMany({ consumerId: userLogin.userId });

        // Delete the user from users list
        await userModel.deleteOne({ _id: userLogin._id });

        // Delete the user from the userDetails
        await usrDetailsModel.deleteOne({ _id });
        res.status(204).end();

    } else if(userType == 'Company') {
        // Get the document of the user in usrDetails
        const userDoc = await companiesModel.findById(_id);
        if(!userDoc) {
            return res.status(404).json({message: 'User not found.'});
        } else if(!userDoc.approvedStatus) {
            return res.status(404).json({message: 'User not approved yet'});
        }

        // Delete the bills of that user
        await billModel.deleteMany({ consumerId: _id });        
        
        // Get the document of the user in users
        const userLogin = await userModel.findById(userDoc.loginId);

        // Delete the receipts of the user
        await receiptModel.deleteMany({ consumerId: userLogin.userId });

        // Delete the advance payment records of that user
        await advancePaymentModel.deleteMany({ consumerId: userLogin.userId });

        // Delete the issues created by the user
        await issueModel.deleteMany({ userName: userLogin.userId });

        // Delete the receipts of the user
        await receiptModel.deleteMany({ consumerId: userLogin.userId });

        // Delete the meter associated with that user
        await meterModel.deleteMany({ username: userLogin.userId });

        // Delete the user from users list
        await userModel.deleteOne({ _id: userLogin._id });

        // Delete the user from the userDetails
        await companiesModel.deleteOne({ _id });
        res.status(204).end();
    } else {
        return res.status(404).json({message: 'No such userType'});
    }
}
const rejectRequest = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { _id, userType } = req.body;
    if(!_id) {
        return res.status(422).json({message: '_id is null'});
    }
    if(!userType) {
        return res.status(422).json({message: 'userType is null'});
    }

    if(userType == 'Individual') {
        // Get the document of the user in usrDetails
        const userDoc = await usrDetailsModel.findById(_id);
        if(!userDoc) {
            return res.status(404).json({message: 'User not found.'});
        } else if(userDoc.approvedStatus) {
            return res.status(404).json({message: 'User is already approved'});
        }

        // Delete the submitted documents from cloudinary
        await cloudinary.uploader.destroy(`GuestUserDocs/${userDoc.citizenshipNo}`, function(error, result) {
            console.log(result);
        });
        await cloudinary.uploader.destroy(`GuestUserDocs/${userDoc.houseNo}_${userDoc.citizenshipNo}`, function(error, result) {
            console.log(result);
        });

        // Delete the user from the userDetails
        await usrDetailsModel.deleteOne({ _id });
        res.status(204).end();

    } else if(userType == 'Company') {
        // Get the document of the user in usrDetails
        const userDoc = await companiesModel.findById(_id);
        if(!userDoc) {
            return res.status(404).json({message: 'User not found.'});
        } else if(userDoc.approvedStatus) {
            return res.status(404).json({message: 'User is already approved'});
        }

        // Delete the user from the userDetails
        await companiesModel.deleteOne({ _id });
        res.status(204).end();
    } else {
        return res.status(404).json({message: 'No such userType'});
    }
}


module.exports = { addReader, fetchReaders, deleteReader, editReader, fetchUsername, addSchedule, fetchSchedules, fetchConsumers, approveUser, deleteUser, rejectRequest, fetchIssues, editUser, fetchConsumerDetails };