module.exports = {
  checkAuth: (req, res, next)=> {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/auth");
  },
  
  checkNotAuth: (req, res, next)=> {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect("/");
  },
  
  hasPermission: (perm)=>{
    return function(req, res, next){
        if (req.isAuthenticated()){
            if(req.user.permissions[perm] === true){
                return next();
            }
            res.redirect('/');
        } else {
          res.redirect('/admin/login')
        };
    }
  }
};