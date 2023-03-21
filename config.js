const crypto = require("crypto");
module.exports = {
    database: "mongodb://localhost:27017/waveDistributor",
    secret: crypto.randomBytes(32).toString("hex")
};