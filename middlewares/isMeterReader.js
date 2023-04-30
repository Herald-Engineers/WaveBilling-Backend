function isMeterReader(req, res, next) {
    if(req.user.userRole === 'reader') {
        next();
    } else {
        res.status(403).json({message: 'You don\'t have permission for this operation'});
    }
}

module.exports = isMeterReader;