const crypto = require("crypto");
module.exports = {
    database: "mongodb+srv://sabin_lohani:1b3i3nSchwpVUz8Y@actors.viouy6d.mongodb.net/?retryWrites=true&w=majority",
    // database: 'mongodb://localhost:27017/waveDistributor',
    secret: crypto.randomBytes(32).toString("hex")
};