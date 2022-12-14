const http = require('http');
const ejs = require('ejs')
const express = require('express')
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })  
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db:process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();  /* app is a request handler function */
const bodyParser = require("body-parser");

// need port argument
if (process.argv.length != 3) {
  process.stdout.write(`Usage ${process.argv[1]} portnumber`);
  process.exit(1);
}
//get the port
const port = process.argv[2]

//starting up server message
console.log(`Web server is running at http://localhost:${port}`);

//CLI

process.stdin.setEncoding("utf8"); /* encoding */

process.stdin.on('readable', () => {  /* on equivalent to addEventListener */
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);  /* exiting */

        }else {
            /* After invalid command, we cannot type anything else */
            console.log(`Invalid command: ${command}`);
        }
        process.stdin.resume();
    }
});

//add path to templates
app.set("views", path.resolve(__dirname, "templates"));

//templating engine
app.set("view engine", "ejs");

//mongodb setup
const uri = `mongodb+srv://${userName}:${password}@cluster0.feh2nwb.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//serve static html
app.get("/", (request, response) => {
    //serve content
    response.render("index");
}); 
app.get("/application",(request, response) => {
    //serve content
    response.render("application",{port});
});
/* Initializes request.body with post information */ 
app.use(bodyParser.urlencoded({extended:false}));

app.post("/application",async (request, response) => {    
   //get form info
    let {name, email, gpa, backgroundInformation} =  request.body;
    name = JSON.stringify(name);

    //create datetime object
    let dateTime = new Date();
    //object to pass to render 
    let entry = {name:name,email:email,gpa:Number(gpa), backgroundInformation:backgroundInformation,dateTime:dateTime}
    let render = {name:name,email:email,gpa:gpa, backgroundInformation:backgroundInformation,dateTime,port}
    //add to database with email as the key
    try {
        await client.connect();
        /* Inserting one app */
        //console.log("***** Inserting one applicant*****");
        await insertApp(client,databaseAndCollection,entry);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    //serve content
    response.render("applicationConfirmation",render);
});
app.get('/reviewApplication', (request, response)=> {
    response.render("reviewApplication",{port})
});
app.post('/reviewApplication', async (request, response)=> {
    let {email} = request.body;
    let name, gpa, backgroundInformation ,dateTime;
    let result;
    //get db entry
    try {
        await client.connect();
        //console.log("***** Looking up one app *****");
        result = await lookupApp(client, databaseAndCollection, email);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    if(result){
        response.render("applicationConfirmation",{name:result.name,email:result.email,gpa:result.gpa, backgroundInformation:result.backgroundInformation,dateTime:result.dateTime,port});
    } else{
        response.end("ERROR NO SUCH USER");
    }
});
app.get('/admin', (request, response)=> {
    //console.log("get");
    response.render("adminGPA",{port})
});
app.post('/admin', async (request, response)=> {
    let {gpa} = request.body;
    let result;
    let table;
    //console.log("post");
    //get db entries
    try {
        await client.connect();
        //console.log("***** Looking up all apps *****");
        result = await lookupMany(client, databaseAndCollection, Number(gpa));
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    if(result){
        table = generateTable(result);
        response.render("processAdminGPA",{table:table,port});
    } else{
        response.end("ERROR NO SUCH USER's");
    }
});
app.get('/removeAll', (request, response)=> {
    response.render("adminRemove",{port})
});
app.post('/removeAll', async (request, response)=> {
    let result;

    try {
        await client.connect();
        //console.log("***** Clearing Collection *****");
        result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    response.render("processAdminRemove",{count:result.deletedCount,port})
});

//listen to the port
app.listen(port);
//add to db
async function insertApp(client, databaseAndCollection, entry) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(entry);
    //console.log(`entry created with id ${result.insertedId}`);
}
//lookup in db
async function lookupApp(client, databaseAndCollection, email) {
    //onsole.log(email);
    let filter = {email: email};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
   return result;
}
async function lookupMany(client, databaseAndCollection, gpa) {
    let filter = {gpa:{$gte: gpa}};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);
    // Some Additional comparison query operators: $eq, $gt, $lt, $lte, $ne (not equal)
    // Full listing at https://www.mongodb.com/docs/manual/reference/operator/query-comparison/
    const result = await cursor.toArray();
    //console.log(result);
    return result;
}

function generateTable(arr){
    let table = "<table border='1'>"
    table += "<tr><th>Name</th><th>GPA</th></tr>";
    arr.forEach(student=>{
        table +=`<tr><td>${student.name}</td><td>${student.gpa}</td</tr>`;
    });
    table += "</table>";

    return table;
}