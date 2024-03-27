const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 8080;

app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`Starting middleware : ${req.url}`);
    next();
});

app.use(bodyParser.json());

// registering with test server
const registerCompany = async (registrationDetails) => {
    try {
        const response = await axios.post('http://20.244.56.144/test/register', registrationDetails);
        return response.data;
    } catch (error) {
        console.error('Error registering company:', error.response.data);
        throw error;
    }
};

// Function to obtain the authorization token
const getAuthToken = async (companyDetails) => {
    try {
        const response = await axios.post('http://20.244.56.144/test/auth', companyDetails);
        return response.data.access_token;
    } catch (error) {
        console.error('Error obtaining authorization token:', error.response.data);
        throw error;
    }
};

app.post('/api/test/register', async (req, res) => {
    const body = req.body;

    if (!body || !body.ownerName || !body.companyName || !body.rollno || !body.ownerEmail || !body.accessCode) {
        return res.status(400).json({ msg: 'All fields are required' });
    }

    const { ownerName, companyName, rollno, ownerEmail, accessCode } = body;

    try {
        // Register company with test server
        const registrationDetails = { ownerName, companyName, rollNo: rollno, ownerEmail, accessCode };
        const responseFromTestServer = await registerCompany(registrationDetails);

        // Obtain authorization token
        const authTokenDetails = {
            companyName,
            clientID: responseFromTestServer.clientID,
            clientSecret: responseFromTestServer.clientSecret,
            ownerName,
            ownerEmail,
            rollNo: rollno
        };
        const authToken = await getAuthToken(authTokenDetails);

        const response = {
            companyName: responseFromTestServer.companyName,
            clientID: responseFromTestServer.clientID,
            clientSecret: responseFromTestServer.clientSecret,
            ownerName: responseFromTestServer.ownerName,
            ownerEmail: responseFromTestServer.ownerEmail,
            rollNo: responseFromTestServer.rollNo,
            accessToken: authToken
        };


        const responseFilePath = path.join(__dirname, 'registration_responses.json');
        fs.readFile(responseFilePath, 'utf8', (err, data) => {
            let responses = [];
            if (!err) {
                try {
                    responses = JSON.parse(data);
                } catch (error) {
                    console.error('Error parsing response file:', error);
                }
            }
            responses.push(response);
            fs.writeFile(responseFilePath, JSON.stringify(responses, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error('Error writing response file:', err);
                }
                console.log('Response saved successfully:', response);
            });
        });

        res.status(201).json(response);
    } catch (error) {
        res.status(500).json({ error: 'Failed to register company with test server' });
    }
});

app.get('/api/test/products', async (req, res) => {
    const { companyName, categoryName, top, minPrice, maxPrice } = req.query;

    try {
        const response = await axios.get(`http://20.244.56.144/test/companies/${companyName}/categories/${categoryName}/products`, {
            params: {
                top: top,
                minPrice: minPrice,
                maxPrice: maxPrice
            }
        });

        const products = response.data.map(product => ({
            productName: product.name,
            price: product.price,
            rating: product.rating,
            discount: product.discount,
            availability: product.availability
        }));

        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error.response.data);
        res.status(500).json({ error: 'Failed to fetch products from the test server' });
    }
});


app.listen(port, () => console.log(`Listening on port: ${port}`));
