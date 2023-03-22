const crypto = require("crypto");
module.exports = {
    database: "mongodb+srv://sabin_lohani:sabinlohani123@cluster0.gnxokru.mongodb.net/?retryWrites=true&w=majority",
    secret: crypto.randomBytes(32).toString("hex")
};