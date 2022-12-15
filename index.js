/* global localStorage, */
const http = require('http');
const ejs = require('ejs')
const express = require('express')
const path = require("path");
var fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
require("dotenv").config({ path: path.resolve(__dirname, '.env') })  
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db:process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();  /* app is a request handler function */
const bodyParser = require("body-parser");
const { application } = require('express');
const { create } = require('domain');

// need port argument
// if (process.argv.length != 3) {
//   process.stdout.write(`Usage ${process.argv[1]} portnumber`);
//   process.exit(1);
// }
//get the port
const port = 3000;

//starting up server message
// const cardSet = require("cardSet.json");
console.log(`Web server is running at http://localhost:${port}`);
console.log(`username: ${userName}`);
console.log(`password: ${password}`);

// Fetch api from website containing open api for us to use

//mongodb setup
const uri = `mongodb+srv://${userName}:${password}@cluster0.xuybtjy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const savePath = './cardSet.json'
fs.access(savePath,fs.F_OK, (err) =>{
  if (err){
    fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php')
  .then((response) => response.json())
  .then((data => {
    fs.writeFile("cardSet.json", JSON.stringify(data), function(err) {
      if (err) {
          console.log(err);
      }
  });
  }));
  }
});
let fileContent = fs.readFileSync("cardSet.json",'utf-8'); 
var res = JSON.parse(fileContent);
cardList = [];
for (key in res["data"]){
  let name = res["data"][key].name;
  name = name.toLowerCase();
  let id = res["data"][key].id;
  let type = res["data"][key].type;
  let atk = res["data"][key].atk;
  let def = res["data"][key].def;
  let level = res["data"][key].level;
  let race = res["data"][key].race;
  let att = res["data"][key].attribute;
  let desc = res["data"][key].desc;
  cardList[key] = {name,id,type,atk,def,level,race,att,desc};
  //updateOne(client, databaseAndCollection, name, {desc: desc});
}
createDB(client,databaseAndCollection,cardList)

console.log(createDB(client,databaseAndCollection,cardList));
async function createDB(client, databaseAndCollectionm, cardArray){
  let filter = {};
  const cursor = client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .find(filter);
  
  const result = await cursor.toArray();
  console.log(`Found: ${result.length} Cards`);

  if(result.length == 0){
    insertMultiple(client, databaseAndCollection, cardList);
  }
}
// console.log(cardList);

//Already inserted check if database is = 0 then add again if needed?
//insertMultiple(client, databaseAndCollection, cardList);

async function updateOne(client, databaseAndCollection, targetName, newValues) {
  let filter = {name : targetName};
  let update = { $set: newValues };

  const result = await client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .updateOne(filter, update);

  console.log(`Documents modified: ${result.modifiedCount}`);
}
async function insertMultiple(client, databaseAndCollection, cardArray) {
  const result = await client.db(databaseAndCollection.db)
                      .collection(databaseAndCollection.collection)
                      .insertMany(cardArray);
                      
  console.log(`Inserted ${result.insertedCount} cards`);
}
let randArr = [];
for(let i = 0; i < 10; i++){
  randArr.push(cardList[getRandomInt(12313)].name);
}
sample = "<ul>";
for(let i in randArr){
  sample+=`<li>${randArr[i]}</li>`;
}
sample += "</ul>";

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
//add path to templates
app.set("views", path.resolve(__dirname, "templates"));

//templating engine
app.set("view engine", "ejs");

app.use(express.static(__dirname + '/templates'));
app.use(bodyParser.urlencoded({extended:false}));

//serve static html

app.get("/", (request, response) => {
    //serve content
    //let single = cardList[123];
    response.render("index",{sample:sample});
}); 

// app.get("/application",(request, response) => {
//     //serve content
//     response.render("application",{port});
// });
/* Initializes request.body with post information */ 
app.post("/", async (request, response) => {
  //serve content
  let name = request.body;
  name = name.name;
  name = name.toLowerCase();
  // console.log(name);
  let single = cardList.find(el => el.name === name);
  if(single != null){
    let id = single.id;
    let cardPhoto = `<img src="https://images.ygoprodeck.com/images/cards/${id}.jpg" alt="${name}">`;
   // let cardPhoto = `<a href="images.ygoprodeck.com/images/cards/${id}.jpg">IMAGE: </a>`;
  
    //GLOBAL.document = new JSDOM(`<a href="images.ygoprodeck.com/images/cards/${id}.jpg"> </a>`).window.document;
  
    response.render("foundCard",{cardName:single.name,cardPhoto:cardPhoto});
  }
  else{
    response.end("Card not found");
  }
  //document.querySelector("#display").innerHTML = `<a href="images.ygoprodeck.com/images/cards/${id}.jpg"> </a>`;

});
// app.get("/foundCard", async (request, response) => {
//   //serve content
//   //let single = cardList[123];
//   response.render("foundCard");
// }); 

app.listen(port);
//add to db
async function insertApp(client, databaseAndCollection, entry) {
    await client.connect();
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(entry);
    console.log(`entry created with id ${result.insertedId}`);
}
//lookup in db
// async function lookupApp(client, databaseAndCollection, email) {
//     //onsole.log(email);
//     let filter = {email: email};
//     const result = await client.db(databaseAndCollection.db)
//                         .collection(databaseAndCollection.collection)
//                         .findOne(filter);
//    return result;
// }
// async function lookupMany(client, databaseAndCollection, gpa) {
//     let filter = {gpa:{$gte: gpa}};
//     const cursor = client.db(databaseAndCollection.db)
//     .collection(databaseAndCollection.collection)
//     .find(filter);
//     // Some Additional comparison query operators: $eq, $gt, $lt, $lte, $ne (not equal)
//     // Full listing at https://www.mongodb.com/docs/manual/reference/operator/query-comparison/
//     const result = await cursor.toArray();
//     //console.log(result);
//     return result;
// }

// function generateTable(arr){
//     let table = "<table border='1'>"
//     table += "<tr><th>Name</th><th>GPA</th></tr>";
//     arr.forEach(student=>{
//         table +=`<tr><td>${student.name}</td><td>${student.gpa}</td</tr>`;
//     });
//     table += "</table>";

//     return table;
// }