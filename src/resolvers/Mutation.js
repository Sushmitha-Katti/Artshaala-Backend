const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { transport, makeANiceEmail } = require("../mail");
//const { hasPermission } = require("../utils");
//const stripe = require("../stripe");
const Razorpay = require("razorpay");
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'artshaalamusicstore@gmail.com',
    pass: process.env.NODE_EMAIL_PASS
  }
});

const instance = new Razorpay({
  key_id: process.env.RAZOR_PAY_KEY,
  key_secret: process.env.RAZOR_PAY_SECRET,
});

const Mutations = {
  //---------------------------------for Creating Contact--------------------------------------------
  async createContact(parent, args, ctx, info){
    const contactinfo = await ctx.db.mutation.createContact(
      {
        data:{
          ...args,
        }
      },
      info
    );
    return contactinfo;

  },

  //----------------------------------Newsletter-----------------------------------------
  async createNewsletter(parent, args, ctx, info){
    const newsletter = await ctx.db.mutation.createNewsletter(
      {
        data:{
          ...args,
        }
      },
      info
    );
    return newsletter;

  },
//--------------------------------------Create Adress-------------------------------------------------------
async createaAddress(parent, args, ctx, info) {
  // 1. Make sure they are signed in
  const { userId } = ctx.request;
  if (!userId) {
    throw new Error("You must be signed in soooon");
  }

  
  // 2. Query the users current address
  const [existingAddress] = await ctx.db.query.addresses({
    where: {
      user: { id: userId },
     
    }
  });
  // 3. Check if the address already exists.If so update the same address.
  if (existingAddress) {
    const updates = { ...args };
    delete updates.id;
   
    return ctx.db.mutation.updateAddress(
      {
        where: { id: existingAddress.id },
        data: { ...updates }
      },
      info
    );
  }
  // 4. If its not, create a new Address for that user!
  return ctx.db.mutation.createAddress(
    {
      data: {
        user: {
          connect: { id: userId }
        },
        ...args
      
      }
      
    },
    info
  );
},



  //--------------------------------- for creating new item----------------------------------------------------

  async createItem(parent, args, ctx, info) {
    console.log(ctx.request.userId);
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );

    if (!hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }

    const createitem = {...args};
    const discountPrice = args.price - (args.discount * args.price/100);
    createitem.discountPrice = discountPrice;
    console.log("*******************************");
    console.log("Price", args.price);
    console.log("discount", args.discount);
    console.log(discountPrice);
   
    //const images= createitem.imagew;
    delete createitem.images
    
    //console.log(images)

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          //  to create a relationship between the Item and the User
          
          ...createitem,
          images:{
            set: args.images
          }
        }
      },
      info
    );

   

    return item;
  },
  //--------------------------------------Update Item--------------------------------------------------------------
  async updateItem(parent, args, ctx, info) {

    //Check whether they are logged in or not
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    //check if the user has the permision to do that
    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );

    if (!hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }

    // first take a copy of the updates
    const updates = { ...args };
    // remove the ID from the updates
    delete updates.id;


     //Query the item
     const item = await ctx.db.query.item(
      {
        where:{ id:args.id},
        
      },
        
      `{
        discount
        price
      }`

    );

    //initialize the price
   const price = args.price ? args.price : item.price;
   const discount= args.discount ? args.discount : item.discount;

   
   
    //Calculate discountprice if there is a dicount
    if(args.discount || args.price)
    {
      updates.discountPrice = price-((discount*price)/100);
    }
    
      
  
      
  
    // run the update method
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },
  //-------------------------------------------Upadate Cart Item---------------------------------------------------------
  updateCart(parent, args, ctx, info) {


     //Check whether they are logged in or not
     if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }
    // first take a copy of the updates
    const updates = { ...args };
   
    // remove the ID from the updates
  
    delete updates.id;
   
    // run the update method
    return ctx.db.mutation.updateCartItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },

  //-------------------------------------------Update Contact-------------------------------------------------------------

  async updateContact(parent, args, ctx, info) {
    console.log("---------------------------");             //todo update contact
    console.log(args);
    const where = { id: args.id };                       ////////////////////////////////////////////
    // 1. find the item
    const item = await ctx.db.query.contacts({ where }, `{ id  name email message subject}`);
    // 2. Check if they own that item, or have the permissions
   console.log(where);
   const hasPermissions = ctx.request.user.permissions.includes(
    "ADMIN"
  );
    
    if ( !hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }
    
   // run the update status
   return ctx.db.mutation.updateContact(
    {
      data: {
        status:"DONE"
      },
      where: {
        id: args.id
      }
    },
    info
  );

  },
//------------------------------------------update the order --------------------------------------------------------

async updateorder(parent, args, ctx, info) {
  console.log("---------------------------");             //todo update contact
  console.log(args);
  const where = { id: args.id };                       ////////////////////////////////////////////
  // 1. find the item
  const item = await ctx.db.query.orders({ where }, `{ id  status }`);
  // 2. Check if they own that item, or have the permissions
 console.log(where);
 const hasPermissions = ctx.request.user.permissions.includes(
  "ADMIN"
);
  
  if ( !hasPermissions) {
    throw new Error("You don't have permission to do that!");
  }
  
 // run the update status
 return ctx.db.mutation.updateOrder(
  {
    data: {
      status: "DELIVERED"
    },
    where: {
      id: args.id
    }
  },
  info
);

},

//-------------------------------------------deleteItem------------------------------------------------------------------
  async deleteItem(parent, args, ctx, info) {

     //Check whether they are logged in or not
     if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    //check if the user has the permision to do that
    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );

    if (!hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }
    const where = { id: args.id };
    // 1. find the item
    const item = await ctx.db.query.item({ where }, `{ id title }`);
    // 2. Check if they own that item, or have the permissions
  
    // const hasPermissions = ctx.request.user.permissions.includes(
    //   "ADMIN"
    // );

    // if (!hasPermissions) {
    //   throw new Error("You don't have permission to do that!");
    // }

    // 3. Delete it!
    return ctx.db.mutation.deleteItem({ where }, info);
  },
  //----------------------------------------Cancel Order ----------------------------------------------------------

  async deleteOrder(parent, args, ctx, info) {

    //Check whether they are logged in or not
    if (!ctx.request.userId) {
     throw new Error("You must be logged in to do that!");
   }

   // query the order
   const orderItem = await ctx.db.query.order(
    {
      where: {
        id: args.id
      }
    },
    `{ id, user { id }}`
  );

  //check if he the one who placed the order earlier

  if(ctx.request.userId != orderItem.user.id){
    throw new Error("Sorry You cannot cance this order")
  }
console.log(orderItem.user.id)

   
   const where = { id: args.id };

 


   // 3. Delete it!
   return ctx.db.mutation.deleteOrder({ where }, info);
 },

  //------------------------------------------Signup--------------------------------------------------------------------
  async signup(parent, args, ctx, info) {
    // lowercase their email
    args.email = args.email.toLowerCase();
    // hash their password
    const password = await bcrypt.hash(args.password, 10);
    // create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ["USER"] }
        }
      },
      info
    );
    try{
      ctx.response.clearCookie('token')
    }
    catch(error){
      console.log(error);
    }
    // create the JWT token for them
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // We set the jwt as a cookie on the response
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    // Returning User to browser
    return user;
  },

  //--------------------------------------------------SignIn-----------------------------------------------------------------
  async signin(parent, { email, password }, ctx, info) {
    // 1. check if there is a user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email ${email}`);
    }
    // 2. Check if their password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid Password!");
    }
    try{
      ctx.response.clearCookie('token')
    }
    catch (error){
      console.log(error);
    }

    
    // 3. generate the JWT Token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // 4. Set the cookie with the token
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    // 5. Return the user
    return user;
  },

  //----------------------------------------------SignOut---------------------------------------------------------------------
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    return { message: "Successfully logged out" };
  },





// ----------------------------------------------Reset Password ---------------------------------------------
  async requestReset(parent, args, ctx, info) {
    // 1. Check if this is a real user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error(`No such user found for email ${args.email}`);
    }
    // 2. Set a reset token and expiry on that user
    const randomBytesPromiseified = promisify(randomBytes);
    const resetToken = (await randomBytesPromiseified(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry },
    });
    
    var mailOptions = {
      from: 'artshaalamusicstore@gmail.com',
      to: user.email,
      subject: 'Artshaala password reset',
      html: makeANiceEmail(`Your Password Reset Token is here!
      \n\n
      <a href="${process.env
        .FRONTEND_URL_DEV}/reset?resetToken=${resetToken}">Click Here to Reset</a>`),
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // 4. Return the message
    return { message: 'Thanks!' };
  },










  //-------------------------------------Reset Password--------------------------------------------------------------------
  async resetPassword(parent, args, ctx, info) {
    // 1. check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Sorry Passwords don't match!");
    }
    // 2. check if its a legit reset token
    // 3. Check if its expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error("This token is either invalid or expired!");
    }
    // 4. Hash their new password
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remove old resetToken fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    // 6. Generate JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    // 7. Set the JWT cookie
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    // 8. return the new user
    return updatedUser;
  },
//-----------------------------------------Create Order-------------------------------------------------------

  async createOrder(parent, args, ctx, info) {
    // 1. Query the current user and make sure they are signed in
    const { userId } = ctx.request;
    if (!userId)
      throw new Error("You must be signed in to complete this order.");
    const user = await ctx.db.query.user(
      { where: { id: userId } },
      `{
      id
      name
      email
      cart {
        id
        quantity
        item { title price id description images type category brand specification stock size  }
      }}`
    );
    
    // 2. recalculate the total for the price
    var rzramount = user.cart.reduce(
      (tally, cartItem) => tally + cartItem.item.price * cartItem.quantity,
      0
    );
    
    console.log(`Going to charge for a total of ${rzramount}`);
    console.log(args);
    //if paymode mode is online
    if (args.mode === 'ONLINE') {
      console.log(args.paymentId);
    
        try{const payment = await instance.payments.capture(
          args.paymentId,
          rzramount * 100
        ).then((response) => {
          console.log("response from razorpay")
          console.log(response);
        }).catch((error) =>{console.log(error)});
     }
        catch(err){
          console.log(err)
        }
  }
 
    // 4. Convert the CartItems to OrderItems
    console.log("in orderItems")
    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        ...cartItem.item,
        images:{
          set: cartItem.item.images
        },
        quantity: cartItem.quantity,
        itemid:cartItem.item.id,
        user: { connect: { id: userId } }
      };
      delete orderItem.id;
      
    
      return orderItem;
    });

    // 5. create the Order
    const order = await ctx.db.mutation.createOrder({
      data: {
        total:rzramount,
        charge: args.paymentId,
        items: { create: orderItems },
        user: { connect: { id: userId } }
      }
    });
    //6. Clean up - clear the users cart, delete cartItems
    const cartItemIds = user.cart.map(cartItem => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({
      where: {
        id_in: cartItemIds
      }
    });
   // 7. Return the Order to the client
    
    const confirmmail = {
      from: 'artshaalamusicstore@gmail.com',
      to: user.email,
      subject: 'Order is Placed Successfully',
      html: `<div><h1>Hello ${user.name}</h1>
      <p>Thank you for your order. We’ll send a confirmation when your order ships</p>
      <h3>Your Order Detatils</h3><hr></hr><p>Order # ${order.id}</p>
      
      <h5>Totoal Amount : ${rzramount}</h5></div>
      <a href="${process.env
        .FRONTEND_URL_DEV}/orders">Click Here to Go to see your orders</a>`
    };

    transporter.sendMail(confirmmail, function(error, info){
      if (error) {
        console.log("order error")
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // 4. Return the message
    return order;


  },
  //--------------------------------------Add To Cart------------------------------------------------------------------------
  async addToCart(parent, args, ctx, info) {
    // 1. Make sure they are signed in
    const { userId } = ctx.request;
   
    if (!userId) {
      throw new Error("You must be signed in soooon");
    }
    // 2. Query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id }
      }
    });
    // 3. Check if that item is already in their cart and increment by 1 if it is
    if (existingCartItem) {
     
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 }
        },
        info
      );
    }
    // 4. If its not, create a fresh CartItem for that user!
    return ctx.db.mutation.createCartItem(
      {
        data: {
          user: {
            connect: { id: userId }
          },
          item: {
            connect: { id: args.id }
          }
        }
        
      },
      info
    );
  },
  //------------------------------------------Remove from cart---------------------------------------------------
  async removeFromCart(parent, args, ctx, info) {
    // 1. Find the cart item
     //Check whether they are logged in or not
     if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    
    const cartItem = await ctx.db.query.cartItem(
      {
        where: {
          id: args.id
        }
      },
      `{ id, user { id }}`
    );
    // 1.5 Make sure we found an item
    if (!cartItem) throw new Error("No CartItem Found!");
    // 2. Make sure they own that cart item
    if (cartItem.user.id !== ctx.request.userId) {
      throw new Error("Sorry! You can't delete this item");
    }
    // 3. Delete that cart item
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id }
      },
      info
    );
  },

   //---------------------------------------- for creating Comment---------------------------------------------------------
   async createComment(parent, args, ctx, info) {
    //console.log(ctx.request.userId);
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }
    
    
    const review = { ...args };
    // remove the ID from the updates
    
    delete review.itemid;
    console.log(review)

    const item = await ctx.db.query.item(
      {
        where:{ id:args.itemid},

      },

      `{
        AvgRating
        comment{
          id
        }
      }`

    );
    const avgrating = (item.AvgRating*item.comment.length+args.rating)/(item.comment.length + 1);

    const comment = await ctx.db.mutation.updateItem(
      {
        where: { id: args.itemid },
        data:{
          AvgRating: avgrating,
          comment: {
            create:{
            ...review,
            user: {
                   connect: {
                     id: ctx.request.userId,
                   },
                 },
                
                }
              }
        }
      },info);
        // data: {
        //   ...review,
        //   // to create a relationship between the Item and the User
        //   user: {
        //     connect: {
        //       id: ctx.request.userId,
        //     },
        //   },
        //   item:{
        //     connect:{
        //       id: args.itemid,
        //     }
        //   },
          
        // }
    //   },
    //   info
    // );

  

    return comment;
  },
//-----------------------------------------------Create Blog ------------------------------------------------------
  async createBlog(parent, args, ctx, info){

     //Check whether they are logged in or not
     if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    //check if the user has the permision to do that
    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );

    if (!hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }
    const item = await ctx.db.mutation.createBlog({
      data: {
        ...args,
        user:{
          connect: {
            id: ctx.request.userId,
          },
        }
        
      }
    }, info);
    console.log(item)
    return item;
  },
//-----------------------------------------------Delete Blog----------------------------------------------------
  async deleteBlog(parent, args, ctx, info){

     //Check whether they are logged in or not
     if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    //check if the user has the permision to do that
    const hasPermissions = ctx.request.user.permissions.includes(
      "ADMIN"
    );

    if (!hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }
    const where = { id: args.id };
    const deletedBlog = await ctx.db.mutation.deleteBlog({ where }, info);
    return deletedBlog;
  }
};



module.exports = Mutations;
