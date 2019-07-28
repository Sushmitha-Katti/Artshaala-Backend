const { forwardTo } = require("prisma-binding");
const Query = {
 
  items: forwardTo('db'),
  item: forwardTo("db"),
  commentsConnection: forwardTo("db"),
  itemsConnection: forwardTo("db"),
  blogs: forwardTo("db"),
  address: forwardTo("db"),
  addresses: forwardTo("db"),
  newsletters: forwardTo("db"),
  categories: forwardTo("db"),
  category:forwardTo("db"),
  subcategories:forwardTo("db"),
  subcategory:forwardTo("db"),
  brands:forwardTo("db"),
  brand:forwardTo("db"),






  async  adminorders(parent, args, ctx, info){

    const { userId } = ctx.request;
    // check if he is a admin or not
    console.log('***************************************')
    if (!userId) {
    throw new Error("You must be signed in soooon");
  }

    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );
    if ( !hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }
    console.log("mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm........................................................cls")
    console.log(args)
    const pendingaddress = await ctx.db.query.orders(
      {
        orderBy:  'status_DESC'
      },
        
      info

    );
    return pendingaddress;

  
  

  },
  
  async blog(parent, args, ctx, info){
    const blog = await ctx.db.query.blog(
      {
        where: { id: args.id}
      },
      info
    );
    return blog;
  },
 

  async comments(parent, args, ctx, info) {    
    
    return ctx.db.query.comments(
      {
        where: { item:{id:args.id}  }
      },
      info
    );
    
   
  },




  async users(parent, args, ctx, info) {
    // 1. Check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You arent logged in!");
    }
    // 2. if they do, query all the users!
    return ctx.db.query.users({}, info);
  },


  me(parent, args, ctx, info) {
    // check if there is a current user ID
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId },
      },
      info
    );
  },



  async contacts(parent, args, ctx, info){

     // 1. Make sure they are logged in
     if (!ctx.request.userId) {
      throw new Error("You arent logged in!");
    }
      // 2. Query contacts
      console.log("status,args".status)
      const contacts = await ctx.db.query.contacts(
        {

          where:{ status:args.status},
           orderBy:  'createdAt_DESC'
          

        },
        info
      );
      
      //if the user is admin
      const hasPermissionToSeeOrder = ctx.request.user.permissions.includes(
        "ADMIN"
      );
      if (!hasPermissionToSeeOrder) {
        throw new Error("You cant see this buddd");
      }
      // 4. Return the order
    return contacts;

  },


  async order(parent, args, ctx, info) {
    // 1. Make sure they are logged in
   

    if (!ctx.request.userId) {
      throw new Error("You arent logged in!");
    }
    // 2. Query the current order
    const order = await ctx.db.query.order(
      {
        where: { id: args.id }
      },
      info
    );
    // 3. Check if the have the permissions to see this order
   
    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );
    const ownsOrder = order.user.id === ctx.request.userId;
    if ( !ownsOrder &&  !hasPermissions) {
      throw new Error("You cant see this buddd");
    }
    // 4. Return the order
    return order;
  },
  
  async orders(parent, args, ctx, info) {
    const { userId } = ctx.request;
    console.log(args)
    if (!userId) {
      throw new Error("you must be signed in!");
    }
    return ctx.db.query.orders(
      {
        where: {
          user: { id: userId }
        },
        orderBy:  'createdAt_DESC'
      },
      info
    );
  },

  async filteritems(parent, args, ctx, info) {   
    let iteminput = {}
    orInputs = []
    
    if(Object.keys(args.selectbrand).length>0){
        iteminput['AND']  = orInputs.push({brand:{'OR':args.selectbrand}})
        
    }
    if(args.category){
      iteminput['category'] = {title:args.category}
    }
    if(args.price){
      orprice = []
     
      if (args.price.length === 2){
        orprice.push({'price_gte':args.price[0],'price_lte':args.price[1]})    
      }
      else{
        orprice.push({'price_gte':args.price[0]})
        
    }
    orInputs.push({'OR': orprice})
    iteminput['AND'] = orInputs
          

    }
    if(args.rating){
      if(args.rating === -1){
        orInputs.push({'AvgRating': null})
      }
      else
      orInputs.push({'AvgRating_gte':args.rating})
      iteminput['AND'] = orInputs
    }
    
    
    return ctx.db.query.items(
      {
        where: iteminput
           
      },
      info
    );
    
   
  },
  
  
};



module.exports = Query;
