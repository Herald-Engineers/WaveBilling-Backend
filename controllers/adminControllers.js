require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');

const userModel = require('../models/userModel');
const meterReaderModel = require('../models/meterReaderModel');
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
    const {fullName, readerId, contactNum, email} = req.body;
    
    if(!fullName || !readerId || !contactNum || !email ) {
        return res.status(422).json({message: 'Fields cannot be left empty'});
    }

    // Check if readerId already exists
    const idAlreadyExists = await userModel.find({ userId: readerId });
    if(idAlreadyExists) return res.status(409).json({message: 'Reader with same id already exists'});

    // Fetch reader of requested id from database
    const currentReader = await meterReaderModel.findById(readerId);

    console.log(currentReader);
}



module.exports = { fetchRequests, addReader, fetchReaders, deleteReader, editReader };