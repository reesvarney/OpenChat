module.exports = (OCCache)=>{
  return {
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
    
    hasPermission: (perm, {id=null, scope="global", subscope=null}={})=>{
      if(id === null){
        return function(req, res, next){
          if (req.isAuthenticated()){
            var permission;
            if(subscope !== null){
              permission = req.user.permissions[scope][subscope][perm];
            } else {
              permission = req.user.permissions[scope][perm];
            }
            if(permission === true){
              return next();
            }
            res.redirect('/');
          } else {
            res.redirect('/admin/login')
          };
        }
      } else {
        if(id in OCCache.permissions){
          if(subscope !== null){
            return OCCache.permissions[id][scope][subscope][perm];
          } else {
            return OCCache.permissions[id][scope][perm];
          }
        } else {
          return false
        }
      }
    }
  }
};