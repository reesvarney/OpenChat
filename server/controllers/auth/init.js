async function initialize(passport, db, temp_users, OCCache) {
  let setup_mode = false;
  let defaultPerms = require('./permissions_default.json');
  let permissions = {};

  // Create permissions based off of the json
  for(const [id, {defaultValue, displayName}] of Object.entries(defaultPerms)){
    permissions[id] = await db.models.Permission.findOrCreate({
      where: {
        "id": id,
      },
      defaults: {
        "defaultValue": defaultValue,
        "name": displayName
      }
    })
  };

  // Checks for the default role
  let defaultRole = await db.models.Role.findOne({
    where: {
      name: "all"
    },
    include: [{model: db.models.PermissionSet, include: [{model:db.models.PermissionValue}]}]
  });

  // If it does not already exist, it creates the role and gives it the default values for each permission
  if(defaultRole === null){
    defaultRole = await createRole("all");
  }

  // Checks for the owner role
  let ownerRole = await db.models.Role.findOne({
    where: {
      name: "owner"
    },
    include: [{model: db.models.User}, {model: db.models.PermissionSet, include: [{model:db.models.PermissionValue}]}]
  });

  // If it does not already exist, it creates the role with admin permissions and gives it to the first user who connects
  if(ownerRole === null ){
    ownerRole = await createRole("owner");
    await db.models.PermissionValue.update({
      value: true
    },
    {
      where: {
        PermissionSetId: ownerRole.PermissionSet.id,
        PermissionId: "isAdmin"
      }
    });
  }
  
  if(ownerRole.Users.length == 0){
    console.log('No owners found, entering setup mode - first client to join will be given owner role');
    setup_mode = true;
  }

  // Creates permissions with default values
  async function createPermissionSet(){
    let newSet = await db.models.PermissionSet.create();
    for(const [id, permission] of Object.entries(permissions)){
      try{
        let newVal = await db.models.PermissionValue.create({
          PermissionId: id,
          value: permission[0].defaultValue
        });
        await newSet.addPermissionValue(newVal);
      }catch(err){
        console.log(err)
      }
    };
    return newSet
  };

  // Creates a role and gives it the default values for each permission
  async function createRole(name){
    try{
      var role = await db.models.Role.create({
        name: name
      });
    } catch(err){
      console.log(err)
    }
    let newSet = await createPermissionSet();
    await role.setPermissionSet(newSet);

    _role = await db.models.Role.findByPk(role.id, {
      include: [
        {
          model: db.models.PermissionSet,
          include: db.models.PermissionValue
        },
        db.models.User
      ]});
    return _role
  };

  // Updates the permissions property of the user to match database values
  async function updateUserPerms(userid){
    let user = {};
    if(userid.startsWith("t::")){
      user = temp_users[userid];
      user["Roles"] = [defaultRole];
    } else {
      let result = await db.models.User.findOne({
        where: {
          id: userid,
        },
        include: [{
          model: db.models.Role,
          include: [{
            model: db.models.PermissionSet,
            include: [{
              model:db.models.PermissionValue
            }]
          }]
        }],
      });
      if(result === null) return false;
  
      if(setup_mode){
        // Giving user owner role
        result.addRole(ownerRole)
        console.log(`User ${result.id} was assigned to owner role, leaving setup mode`)
        setup_mode = false;
      }
  
      user = result;
    }
    
    let permissions = {"global" : {},"categories": {}, "channels": {}};

    if(user.Roles.length === 0){
      // User does not have any roles, give them the default role
      result.addRole(defaultRole).catch(err=>{console.log('Unique constraint exists')});
      for (const {PermissionId, value} of defaultRole.PermissionSet.PermissionValues) {
        permissions["global"][PermissionId] = (permissions["global"][PermissionId] === true) ? true : value;
      }
    } else {
      // User has at least 1 role, runs for each
      for(const role of user.Roles){
        let test = role.PermissionSet.PermissionValues.filter(({PermissionId, value})=> PermissionId === "isAdmin" && value === true);
        if(test.length > 0) {
          // Role includes admin permission, make all of these true
          for (const key of Object.keys(defaultPerms)) {
            permissions["global"][key] = true;
          }
          // Return true to stop looping through the array of roles
          break;
        } else {
          for (const {PermissionId, value} of role.PermissionSet.PermissionValues) {
            permissions["global"][PermissionId] = (permissions["global"][PermissionId] === true) ? true : value;
          }
        }
      }
    };

    // TODO: Handle channel permissions as well (need to create channel permissions first)
    // Will populate for each channel regardless of whether user has defined permissions for it, and factor in global/ category permissions
    // This means when checking if a user can do something we can simply just check user.permissions.channels[currentchannel]
    // Will also need to find a way for a user to have individual perms for channels/ categories rather than just roles

    let categories = await db.models.Category.findAll();
    for(const {id} of categories){
      // temp, will need to check category permission assignments
      permissions["categories"][id] = permissions["global"];
    };

    let channels = await db.models.Channel.findAll();
    for(const {id} of channels){
      // temp, will need to check channel permission assignments
      permissions["channels"][id] = permissions["global"];
    };

    OCCache.permissions[userid] = permissions;
    user.permissions = permissions;
    return user
  };

  passport.serializeUser(function (user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    // Check if the id starts with `t::` which is used to denote temporary users. Otherwise they are a normal user
    if (id.startsWith("t::")) {
      if (temp_users[id] === undefined) return done(null, false);
      updateUserPerms(id).then(user =>{
        // Override send message permission, needed until temporary messages can be implemented
        for(const set of ["channels", "categories"]){
          for(const scope of Object.values(user.permissions[set])){
            scope["send_message"] = false;
          };
        };
        return done(null, user);
      });
    } else {
      updateUserPerms(id).then(user =>{
        // Returns false if the user does not exist so we can just pass the value through
        return done(null, user);
      });
    };
  });

  return {createRole, updateUserPerms}
}

module.exports = initialize;