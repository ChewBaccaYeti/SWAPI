const supertest = require('supertest');
const express = require('express');
const axios = require('axios');
const axiosMock = require('axios-mock-adapter');
const app = express();

// Middleware для получения данных о людях
const fetchPeopleData = (req, res, next) => {
    axios.get('https://swapi.dev/api/people')
        .then((apiResponse) => {
            req.swapiPeopleData = apiResponse.data;
            next();
        })
        .catch((error) => {
            console.error('Error acquired during fetching data from SWAPI.', error);
            res.status(500).send('Server error.');
        });
};

// Middleware для получения данных о звездных кораблях
const fetchStarshipsData = (req, res, next) => {
    axios.get('https://swapi.dev/api/starships')
        .then((apiResponse) => {
            req.swapiStarshipsData = apiResponse.data;
            next();
        })
        .catch((error) => {
            console.error('Error acquired during fetching data from SWAPI.', error);
            res.status(500).send('Server error.');
        });
};

// Middleware для получения данных о видах
const fetchSpeciesData = (req, res, next) => {
    axios.get('https://swapi.dev/api/species')
        .then((apiResponse) => {
            req.swapiSpeciesData = apiResponse.data;
            next();
        })
        .catch((error) => {
            console.error('Error acquired during fetching data from SWAPI.', error);
            res.status(500).send('Server error.');
        });
};

app.use('/people', fetchPeopleData, (req, res) => {
    res.json(req.swapiPeopleData);
});

app.use('/starships', fetchStarshipsData, (req, res) => {
    res.json(req.swapiStarshipsData);
});

app.use('/species', fetchSpeciesData, (req, res) => {
    res.json(req.swapiSpeciesData);
});

// Тесты
describe('GET /people', () => {
    let mock;
    beforeAll(() => {
        mock = new axiosMock(axios);
    });
    afterEach(() => {
        mock.reset();
    });
    afterAll(() => {
        mock.restore();
    });

    test('should fetch data from SWAPI about people and return it as JSON', async () => {
        const mockData = {
            results: [
                { name: 'Luke Skywalker' },
                { name: 'Darth Vader' }
            ]
        };
        mock.onGet('https://swapi.dev/api/people').reply(200, mockData);
        const response = await supertest(app).get('/people');
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockData);
    });

    test('should return 500 if SWAPI request fails', async () => {
        mock.onGet('https://swapi.dev/api/people').reply(500);
        const response = await supertest(app).get('/people');
        expect(response.status).toBe(500);
        expect(response.text).toBe('Server error.');
    });
});

describe('GET /starships', () => {
    let mock;
    beforeAll(() => {
        mock = new axiosMock(axios);
    });
    afterEach(() => {
        mock.reset();
    });
    afterAll(() => {
        mock.restore();
    });

    test('should fetch data from SWAPI about starships and return it as JSON', async () => {
        const mockData = {
            results: [
                { name: 'Death Star' },
                { name: 'CR90 corvette' }
            ]
        };
        mock.onGet('https://swapi.dev/api/starships').reply(200, mockData);
        const response = await supertest(app).get('/starships');
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockData);
    });
});

describe('GET /species', () => {
    let mock;
    beforeAll(() => {
        mock = new axiosMock(axios);
    });
    afterEach(() => {
        mock.reset();
    });
    afterAll(() => {
        mock.restore();
    });

    test('should fetch data from SWAPI about species and return it as JSON', async () => {
        const mockData = {
            results: [
                { name: 'Wookie' }
            ]
        };
        mock.onGet('https://swapi.dev/api/species').reply(200, mockData);
        const response = await supertest(app).get('/species');
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockData);
    });
});
