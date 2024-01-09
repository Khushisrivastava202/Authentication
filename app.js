const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const encrypt=require("mongoose-encryption");


const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true });

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

const userSchema={
    email:String,
    password: String
};



const User=new mongoose.model("User",userSchema);

app.get("/", function(req,res){
    res.render("home");
});

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});

app.post("/register", async function(req, res) {
    try {
      const newUser = new User({
        email: req.body.username,
        password: req.body.password
      });
  
      await newUser.save();
      res.render("secrets");
    } catch (err) {
      console.error(err);
    }
  });
  
  app.post("/login", async function(req, res) {
    try {
      const username = req.body.username;
      const password = req.body.password;
  
      const foundUser = await User.findOne({ email: username });
  
      if (foundUser) {
        // Use a secure password comparison method (e.g., bcrypt) in a real-world scenario
        if (foundUser.password === password) {
          res.render("secrets");
        } else {
          res.status(401).send("Invalid password");
        }
      } else {
        res.status(404).send("User not found");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Error during login");
    }
  });
  
app.listen(3000,function(){
    console.log("Server started on port 3000");
});