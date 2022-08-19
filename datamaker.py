import pandas as pd
import numpy as np
import random as rand


governments = np.array(['Alexandria', 'Aswan', 'Asyut', 'Behiera', 'Beni suef', 'Cairo', 'Dakahlia',
                       'Damietta', 'Faiyum', 'Gharbia', 'Giza', 'Ismaillia', 'Kafr El Sheikh', 'Luxor',
                       'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 
                       'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez']);

peachAccess = np.array([1,0,0,0,0,0,0,
                       0,0,0,0,0,0,0,
                       1,0,0,0,1,0,0,
                       0,1,0,0,1,1]);

columns = np.array(["City","Beach access","AC","Market","Parking","Private pool","Room service","Transportation","WiFi","Price"]);

propertyData = pd.read_csv('property data.csv')

row = 0
while(row<=1000):
    columnCounter = 0
    while(columnCounter<10):
        if columnCounter == 0:
            propertyData.at[row,columns[columnCounter]]=rand.choice(governments)
        elif columnCounter == 1:
            govNumber = np.where(governments == propertyData.iat[row,0])
            if peachAccess[govNumber[0][0]] == 0:
                propertyData.at[row,columns[columnCounter]]=False;
            else:
                propertyData.at[row,columns[columnCounter]]=True;
        elif columnCounter == 9:
            money = 200;
            for x in range(2,8):
                if propertyData.iat[row,x] == True:
                    money+=100;
            propertyData.at[row,columns[columnCounter]]=money;
        else:
            propertyData.at[row,columns[columnCounter]]=rand.choice([True,False]);
        columnCounter+=1
    row+=1

propertyData.to_csv('property data.csv',index=False)

userRating = pd.read_csv('user rating.csv');
userColumns = np.array(["User ID", "Property ID", "Rating"]); 
row=0;
while(row<=100):
    columnCounter = 0
    while(columnCounter<3):
        if columnCounter == 0:
            userRating.at[row,userColumns[columnCounter]]=rand.randint(0,9);
        elif columnCounter == 1:
            userRating.at[row,userColumns[columnCounter]]=rand.randint(0,1000);
        else:
            userRating.at[row,userColumns[columnCounter]]=rand.randint(0,5);
        columnCounter+=1;    
    row+=1

userRating.to_csv('user rating.csv',index=False)


