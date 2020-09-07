var db = require('../db/init.js')

module.exports = (admin_key) => {
    //Create basic administrator role, this will be 
    db.models.Role.findOrCreate({
            where: {
                name: "owner"
            },
            defaults: {
                name: "owner",
                isAdmin: true
            }
    }).then((role) => {
        db.models.User.findOrCreate({
            where: {
                pub_key: admin_key
            },
            defaults: {
                name: "admin",
                pub_key: admin_key
            }
        }).then((user) => {
            user[0].addRole(role);
        });
    });
};