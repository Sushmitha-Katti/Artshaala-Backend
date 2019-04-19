const { forwardTo } = require("prisma-binding");
const Query = {
  items: forwardTo("db"),

  item: forwardTo("db"),
  commentsConnection: forwardTo("db"),
  itemsConnection: forwardTo("db"),


  

  async comments(parent, args, ctx, info) {
    // check item exists or not ?
    
    
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
    const ownsOrder = order.user.id === ctx.request.userId;
    const hasPermissionToSeeOrder = ctx.request.user.permissions.includes(
      "ADMIN"
    );
    if (!ownsOrder && !hasPermissionToSeeOrder) {
      throw new Error("You cant see this buddd");
    }
    // 4. Return the order
    return order;
  },
  
  async orders(parent, args, ctx, info) {
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error("you must be signed in!");
    }
    return ctx.db.query.orders(
      {
        where: {
          user: { id: userId }
        }
      },
      info
    );
  },
  
};
module.exports = Query;
