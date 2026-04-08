
function isAdmin(req, res, next) {
    
    
    

   if (req.session.user && req.session.user.is_admin === true) {
    next();
} else {
    res.status(403).json({
        error: 'Access denied',
        debug: {
            hasSession: !!req.session,
            hasUser: !!req.session?.user,
            adminStatus: req.session?.user?.is_admin
        }
    });
}
}
module.exports = isAdmin