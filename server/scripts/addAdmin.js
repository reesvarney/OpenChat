module.exports = (db, admin_key) => {
    //Create basic administrator role, this will be 
    db.models.Role.findOrCreate({
            where: {
                name: "owner"
            },
            defaults: {
                name: "owner",
                isAdmin: true
            }
    }).catch((err) => {
        console.log(err);
    }).then((role) => {
        db.models.User.findOrCreate({
            where: {
                pub_key: admin_key
            },
            defaults: {
                name: "admin",
                pub_key: admin_key
            }
        }).catch((err) => {
            console.log(err);
        }).then((user) => {
            user[0].addRole(role[0]).catch((err) => {
                console.log(err);
            });
        });
    });
};