function isAdmin(req, res, next) {
    if(req.user.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({message: 'You don\'t have permission for this operation'});
    }
}

module.exports = isAdmin;