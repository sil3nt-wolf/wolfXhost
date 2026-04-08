const express = require('express');
const { countries } = require('countries-list');
const router = express.Router();



const topCountries = [
    "Pakistan", "India", "Canada", "Australia",
    "Nigeria", "South Africa", "Kenya", "United Arab Emirates"
];


router.get('/api/countries', (req, res) => {
    const countryNames = Object.values(countries)
        .map(country => country.name)
        .filter(country => !topCountries.includes(country)) 
        .sort(); 

    
    const sortedCountries = [...topCountries, ...countryNames];
    res.json(sortedCountries);  
});
module.exports = router;