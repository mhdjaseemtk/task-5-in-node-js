import express from 'express'
import {MongoClient} from 'mongodb'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import session from 'express-session'
import MongoStore from 'connect-mongo'


const app = express()



dotenv.config()
app.use(express.urlencoded({extended:true}))
app.set('view engine','ejs')




const client = new MongoClient(process.env.MONGO_URL)
let db;

 async function connectDB(){

  await client.connect()
  console.log('mongodb connect');
  db = client.db('main_project')
}
connectDB()


app.use(session({
  secret:process.env.SECRET_KEY ||  'GGTYJGJY',
  resave:false,
  saveUninitialized:false,
  store:MongoStore.create({
    client:client,
    dbName:"main_project",
    collectionName:"sessions"
  }),

  cookie:{maxAge:1000*60*60}
}))

function auth(req,res,next){
  if(!req.session.userId){
    return res.redirect('/login')
  }
  next()
}
app.get('/dashboard',auth,(req,res)=>{
  res.render('dashboard')
})


app.get('/',(req,res)=>{
  res.render('home')
})







app.post('/signup', async (req,res)=>{
  const {email,password} = req.body
   const coll = db.collection('user')
  const existing = await coll.findOne({email})
  console.log(existing);
  

  if(existing){

   return res.send('user already exists')
  }

  const h_Password = await bcrypt.hash(password,10)

  const user = {email,password:h_Password,active:true}
 
  coll.insertOne(user)
  res.send("logined")


  
})

app.post('/login',async (req,res)=>{

  const {email,password} = req.body
  const coll = db.collection("user")


  const userExsits = await coll.findOne({email})

  const admin={email:"admin@gmail.com",password:"1234"}
  if(email == admin.email && password == admin.password){
    req.session.userId = 'admin'
    req.session.userEmail = admin.email
    return res.redirect('/admin')
  }



  const match = await bcrypt.compare(password ,userExsits.password)
  if(match){

    req.session.userId = userExsits._id
    req.session.userEmail = userExsits.email
    
    
   return res.render("users")
  }else{
    res.send("invalid email and password")
  }
  

})

app.get('/login',(req,res)=>{
  res.render('login')
})

app.get('/signup',(req,res)=>{
  res.render('signup')
})

app.get('/admin',adminauth, async (req,res)=>{
 

  const allUsers = await db.collection('user').find().toArray()
   res.render('dashboard',{allUsers})
  


})

function adminauth(req,res,next){
if(req.session.userEmail == 'admin@gmail.com'){
  return next()}else{
    return res.redirect('login')
  }
}

app.get('/logout',(req,res)=>{
  req.session.destroy(err =>{
    if(err){
      console.log(err);
      return res.send('error')
      
    }
    res.clearCookie('connect.sid')
    res.redirect('/login')
  })
})



app.listen(process.env.PORT || 3000,()=>{
  console.log("server running");
  
})

