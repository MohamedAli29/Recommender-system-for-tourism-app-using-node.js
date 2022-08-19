const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const dfd = require('danfojs-node');
const Property = require('./data/property');
const User = require('./data/user'); 
const Reservation = require('./data/reservation');
const tf = require('@tensorflow/tfjs');

//egyptian governments array

const governments = ['Alexandria', 'Aswan', 'Asyut', 'Behiera', 'Beni suef', 'Cairo', 'Dakahlia',
                     'Damietta', 'Faiyum', 'Gharbia', 'Giza', 'Ismaillia', 'Kafr El Sheikh', 'Luxor',
                     'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 
                     'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez'];

//property columns

const propertyColumns = ['city', 'beachAccess', 'AC', 'market', 'parking', 'privatePool', 'roomService', 'transportation', 'WiFi', 'price'];

//connect to database and launch server

mongoose.connect('mongodb://localhost:27017/yallaSafar', {
    useNewUrlParser: true
});

const port = process.env.PORT || 8000;

app.use(('/', express.static(path.join(__dirname, 'form'))))
app.use(bodyParser.json());

app.listen(port, () => {
    console.log('listening on port ' + port)
})

//requests to add values to the database
//IMPORTANT: reservations depend on id's generated in database, so you have to get the user and property id's first before adding reservations to database. 


/*app.post('/addUsers',async(req,res)=>{
    const data = await dfd.readCSV('user.csv').then(userData => { 
        const jsonObj = dfd.toJSON(userData);
        const response = User.create(jsonObj);
        console.log(response);

    });
    res.json("done");

})*/

/*app.post('/addProperty',async(req,res)=>{
    const data = await dfd.readCSV('property data.csv').then(PropertyData => { 
        const jsonObj = dfd.toJSON(PropertyData);
        const response = Property.create(jsonObj);
        console.log(response);

    });
    res.json("done");
})*/

/*app.post('/addReservation',async(req,res)=>{
    const data = await dfd.readCSV('reservation.csv').then(ReservationData => { 
        const jsonObj = dfd.toJSON(ReservationData);
        const response = Reservation.create(jsonObj);
        console.log(response);

    });
    res.json("done");

})*/

//get specific user from database

app.get('/user/:id', async(req, res) => {   
    const { id } = req.params;
    const user = await User.findById(id);
    res.json({ user });
})

//get specific property

app.get('/property/:id', async(req, res) => {   
    const { id } = req.params;
    const property = await Property.findById(id);
    res.json({ property });
})

//get specific reservation from database

app.get('/reservation/:id', async(req, res) => {   
    const { id } = req.params;
    const reservation = await Reservation.findById(id);
    res.json({ reservation });
})

//get specific user's reservations

app.get('/userReservations/:id', async(req, res) => { 
    const { id } = req.params;
    const reservations = await Reservation.find({userID: id}).select('propertyID rating -_id').lean().exec();
    var tempProperties = [reservations.length];
    for(let i = 0; i < reservations.length; i++) {
        tempProperties[i] = reservations[i].propertyID;
    }
    const properties = await Property.find().where('_id').in(tempProperties).exec();
    res.json({ reservations, properties });
});

//-----------------------------------------------------recommender request-------------------------------------------------------//

app.get('/recommend/:id', async(req, res) => {
    //get user reservation then data of properties reserved
    const { id } = req.params;
    const reservations = await Reservation.find({userID: id}).select('propertyID rating -_id').lean().exec();
    var tempProperties = [reservations.length];
    for(let i = 0; i < reservations.length; i++) {
        tempProperties[i] = reservations[i].propertyID;
    }
    const properties = await Property.find().where('_id').in(tempProperties).exec();

    //cleaning data
    let userReservation = new dfd.DataFrame(JSON.parse(JSON.stringify(properties)));
    userReservation.drop({columns: ["__v"], inplace:true });

    userReservation = userReservation.replace(true,'1');
    userReservation = userReservation.replace(false,'0');

    userReservation.head(10).print();
    
    for(let i = 0; i < governments.length; i++) {
        userReservation = userReservation.replace(governments[i],i.toString());
    }

    for(let i = 0; i < propertyColumns.length; i++) {
        userReservation = userReservation.asType(propertyColumns[i],"int32");
    }

    //print user reserved property data and id's
    console.log("\n------------------------------------------------------------reservation data--------------------------------------------------------\n");
    userReservation.print(userReservation.length);
    //userReservation['_id'].print(userReservation.length);

    //print user rated property data and property id's
    let userRating = new dfd.DataFrame(JSON.parse(JSON.stringify(reservations)));
    userRating.print(userRating.index.length);
    //userRating['propertyID'].print(userRating.length);

    console.log("------------------------------------------------------------extracted and sort ratings--------------------------------------------------------\n");
    //extract ratings from user rating data
    let ratingArr = userRating.column('rating');
    ratingArr.print(ratingArr.index.length);

    //sorting ratings to match corresponding property data
    let tempArr = [ratingArr.index.length];
    for(let i = 0; i < userReservation.index.length; i++){
        for(let j = 0; j < userRating.index.length; j++) {
            if(userReservation.at(i,"_id") == userRating.at(j,"propertyID")) {
                tempArr[i] = userRating.at(j,"rating");
            }
        }
    }
    let sortedRatingArr = new dfd.Series(tempArr);
    sortedRatingArr.print();

    console.log("------------------------------------------------------------clearing data--------------------------------------------------------\n");
    //clearing id's to keep required numbers to build user's profile
    userReservation = userReservation.drop({columns: ["_id"]})
    userReservation.print(userReservation.index.length);
    
    //scaling data
    let scalerMM = new dfd.MinMaxScaler();
    let scaledUserReservation = scalerMM.fit(userReservation).transform(userReservation);
    scaledUserReservation.print(scaledUserReservation.index.length);

    console.log("------------------------------------------------------------getting weighted data--------------------------------------------------------\n");
    //getting weights
    let weightedUserReservations = scaledUserReservation.mul(sortedRatingArr,{ axis: 0 });
    weightedUserReservations.print(weightedUserReservations.index.length);

    console.log("------------------------------------------------------------getting user's profile--------------------------------------------------------\n");
    //building user's profile
    df_sum = weightedUserReservations.cumSum({axis: 0}).tail(1);
    df_sum.print();

    let normalizer = df_sum.cumSum({axis: 1}).price.$data;

    let userProfile = df_sum.div(normalizer);
    userProfile.print(userProfile.index.length);

    //get all properties
    let allProperties = await Property.find().select('-__v').lean().exec();
    
    console.log("------------------------------------------------------------cleaning all properties data--------------------------------------------------------\n");
    //cleaning data for processing
    let propertiesDFRaw = new dfd.DataFrame(JSON.parse(JSON.stringify(allProperties)));
    propertiesDFRaw.head().print();
    //propertiesDFRaw.describe().print();

    let propertiesDF = propertiesDFRaw;

    propertiesDF = propertiesDF.replace(true,'1');
    propertiesDF = propertiesDF.replace(false,'0');

    for(let i = 0; i < governments.length; i++) {
        propertiesDF = propertiesDF.replace(governments[i],i.toString());
    }

    for(let i = 0; i < propertyColumns.length; i++) {
        propertiesDF = propertiesDF.asType(propertyColumns[i],"int32");
    }

    console.log("------------------------------------------------------------data where abouts--------------------------------------------------------\n");
    //print data and its whereabouts after processing
    propertiesDF.head().print();
    propertiesDF.describe().print();
    propertiesDF.ctypes.print();

    console.log("------------------------------------------------------------multiply by user's profile--------------------------------------------------------\n");
    //separating id's from data then multiplying data by user profile then attaching id's again

    propertiesDF.drop({ columns: ["_id"], inplace: true });
    propertiesDF.head().print();
    propertiesDF.describe().print();
    //propertiesDF.ctypes.print();

    let scaledPropertiesDF = scalerMM.fit(propertiesDF).transform(propertiesDF);
    let weightedProperties = scaledPropertiesDF.mul((userProfile));
    weightedProperties.head().print();
    weightedProperties.describe().print();

    console.log("------------------------------------------------------------rating and sorting then recommendation--------------------------------------------------------\n");
    //getting back id's, rating and sorting data
    summedNumbers = weightedProperties.cumSum({ axis: 1 });
    let finalRatingArr = summedNumbers.column("price");
    finalRatingArr.mul(5,{inplace:true});
    //finalRatingArr.head().print(); 
    finalRatingArr.describe().print();

    modRatingArr = new dfd.Series(dfd.toJSON(finalRatingArr));

    propertiesDFRaw.addColumn("rating", modRatingArr, { inplace: true });
    propertiesDFRaw.sortValues("rating", { ascending: false, inplace: true });
    //propertiesDFRaw.head().print();

    let finalRecommendation = propertiesDFRaw.iloc({rows: ["0:19"]});
    finalRecommendation.head(20).print();

    let Recommendation = dfd.toJSON(finalRecommendation);
    //res.json("done");
    res.json({Recommendation});
})
