const jwt = require('jsonwebtoken');
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // If token is null
    if (token == null) return res.status(401).json({message: 'Missing token'});

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({message: 'Invalid token'});
        req.user = user;
        next();
    })
}
module.exports = authenticateToken;