require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');

const userModel = require('../models/userModel');
const meterReaderModel = require('../models/meterReaderModel');
const scheduleModel = require('../models/scheduleModel');
const bcrypt = require('bcrypt');

const fetchRequests = async (req, res) => {
    const token = req.body.token;
    if(!token) {
        return res.status(401).send('Unauthorized: No token provided');
    }
    try {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch(err) {
        return res.status(401).send('Unauthorized: Invalid token');
    }
    console.log();
    res.send('nice');
    // const {username, password} = req.body;
    // try {
    //     // Check if user exists in server
    //     const user = await userModel.findOne({ username });
    //     if (!user) {
    //       return res.status(404).json({ message: "No user found" });
    //     }
    
    //     // Check if password is correct
    //     const isMatch = await bcrypt.compare(password, user.password);
    //     if (!isMatch) {
    //       return res.status(401).json({ message: "Password incorrect" });
    //     }
    
    //     // Create token and send response
    //     const token = jwt.sign({username: user.username, id: user._id}, process.env.ACCESS_TOKEN_SECRET);
    //     res.status(200).json({fullName: user.username, role: user.userRole, token});
    // } catch(err) {
    //     console.log(err);
    //     res.status(500).json({message: 'Server Error'});
    // }
}

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

const fetchReaders = async (req, res) => {
    const readers = await meterReaderModel.find();
    res.json(readers);
}

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
    await userModel.findByIdAndDelete(reqReader.loginId);

    // Delete the reader details
    await meterReaderModel.findByIdAndDelete(_id);

    res.status(204).end();
}

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

const addSchedule = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({message: 'req.body is null'});
    }
    const { address1, address2, address3, address4, address5, date, shift, assignedTo } = req.body;
    if(!address1) {
        return res.status(422).json({message: 'Address 1 should not be null'});
    }
    if(!date || !shift || !assignedTo) {
        return res.status(422).json({message: 'Please fill out all the required fields.'});
    }
    try {
        const findReader = await meterReaderModel.findById(assignedTo);
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
            assignedTo: findReader._id
        })
        res.status(201).json({message: 'Scheduled successfully.'});
    } catch(err) {
        console.log(err);
        res.status(500).json({message: 'Server error'});
    }


}


module.exports = { fetchRequests, addReader, fetchReaders, deleteReader, editReader, fetchUsername, addSchedule };