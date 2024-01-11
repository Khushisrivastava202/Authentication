
require('dotenv').config();
const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
// const encrypt=require("mongoose-encryption");
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();



app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));


app.use(session({
  secret: 'Our liitle secret',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session()); //from doc https://www.passportjs.org/tutorials/google/prompt/

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true });
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

const userSchema=new mongoose.Schema({
  email:String, 
  password: String,
  googleId:String,
  secret:String
}); 

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
  
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:["password"]}); 

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user,done){
  done(null,user.id);
});


passport.deserializeUser(function(id, done) {
  User.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});



passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile); 
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", function(req,res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});

app.get("/logout",function(req,res){
    req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})
   
app.get("/secrets", function(req, res) {
  User.find({"secret": {$ne: null}})
    .then(foundUsers => {
      res.render("secrets", { userWithSecrets: foundUsers });
    })
    .catch(err => {
      console.log(err);
      // Handle the error appropriately (e.g., render an error page)
    });
});


app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");  // Correct template name without leading /
  } else {
    res.redirect("/login");
  }
});


app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id)
    .then(foundUser => {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        return foundUser.save();
      }
    })
    .then(() => {
      res.redirect("/secrets");
    })
    .catch(err => {
      console.error(err);
    });
});

app.post("/register", function(req, res) {
  User.register({ username: req.body.username, active: false }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

  // bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
  //   try {
  //     const newUser = new User({
  //       email: req.body.username,
  //       password: hash
  //     });

  //     await newUser.save();
  //     res.render("secrets");
  //   } catch (err) {
  //     console.error(err);
  //     res.status(500).send("Error during registration");
  //   }
  // });


  
  app.post("/login", async function(req, res) {

    const user=new User({
     username:req.body.username,
     password: req.body.password,
    } );

    req.logIn(user,function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }
    })


    // try {
    //   const username = req.body.username;
    //   const password = req.body.password;
  
    //   const foundUser = await User.findOne({ email: username });
  
    //   if (foundUser) {
    //     // Use a secure password comparison method (e.g., bcrypt) in a real-world scenario
    //     bcrypt.compare(password, foundUser.password, function(err, result) {
    //        if(result == true){
    //        res.render("secrets");
    //        } else {
    //       res.status(401).send("Invalid password");
    //     }
    //   });          
        
    //   } else {
    //     res.status(404).send("User not found");
    //   }
    // } catch (err) {
    //   console.error(err);
    //   res.status(500).send("Error during login");
    // }
  });
  
app.listen(3000,function(){
    console.log("Server started on port 3000");
});