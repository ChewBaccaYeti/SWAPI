"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = 3030;
// Endpoints
const people = 'https://swapi.dev/api/people';
const starships = 'https://swapi.dev/api/starships';
const species = 'https://swapi.dev/api/species';
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
// Serve static files from the directory
app.use(express_1.default.static(path_1.default.join(__dirname)));
function fetchWithCache(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        const cached = cache.get(url);
        if (cached && cached.expiration > now) {
            console.log(`Service from cache: ${url}`);
            return cached.data;
        }
        console.log(`Fetching fresh data: ${url}`);
        const response = yield axios_1.default.get(url);
        cache.set(url, { data: response.data, expiration: now + CACHE_TTL });
        return response.data;
    });
}
;
// Middleware to fetch ALL data for designated endpoints below
function fetchAllData(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, limit = 20) {
        let results = [];
        let nextUrl = url;
        while (nextUrl && results.length < limit) {
            const { next, results: newResults } = yield fetchWithCache(nextUrl);
            // const response: { data: { next: string | null, results: T[] } } = await axios.get(nextUrl);
            results = results.concat(newResults); // Сшиваю данные между собой
            if (results.length >= limit) {
                results = results.slice(0, limit); // Обрезаю массив до определенного количества
                break; // Прерываю операцию
            }
            nextUrl = next; // Переход на следующий ендпоинт
        }
        return results;
    });
}
// Middleware to fetch characters data from SWAPI
function fetchCharactersData(request, response, next) {
    fetchAllData(`${people}`, 20)
        .then(characters => {
        request.swapiData = { count: characters.length, next: null, previous: null, results: characters };
        next();
    })
        .catch(function (error) {
        console.error('Error acquired during fetching characters from SWAPI.', error);
        response.status(500).send('Server error.');
    });
}
;
// Middleware to fetch starships data from SWAPI
function fetchStarshipsData(request, response, next) {
    fetchAllData(`${starships}`, 20)
        .then(starships => {
        request.swapiData = { count: starships.length, next: null, previous: null, results: starships };
        next();
    })
        .catch(error => {
        console.error('Error acquired during fetching starships from SWAPI.', error);
        response.status(500).send('Server error.');
    });
}
// Middleware to fetch species data from SWAPI
function fetchSpeciesData(request, response, next) {
    fetchAllData(`${species}`, 20)
        .then(species => {
        request.swapiData = { count: species.length, next: null, previous: null, results: species };
        next();
    })
        .catch(error => {
        console.error('Error acquired during fetching species from SWAPI.', error);
        response.status(500).send('Server error.');
    });
}
// Route to return the fetched data
app.get('/people', fetchCharactersData, (request, response) => {
    response.json(request.swapiData);
});
app.get('/starships', fetchStarshipsData, (request, response) => {
    response.json(request.swapiData);
});
app.get('/species', fetchSpeciesData, (request, response) => {
    response.json(request.swapiData);
});
// Тут заключена логика ручного поиска данных уже из кэша
app.get('/search', (request, response) => {
    var _a, _b, _c, _d;
    const query = ((_a = request.query.q) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase()) || '';
    if (!query) {
        return response.status(400).json({ error: 'Query parameter is required' });
    }
    const results = {
        characters: ((_b = cache.get(people)) === null || _b === void 0 ? void 0 : _b.data.results.filter((char) => char.name.toLowerCase().includes(query))) || [],
        starships: ((_c = cache.get(starships)) === null || _c === void 0 ? void 0 : _c.data.results.filter((ship) => ship.name.toLowerCase().includes(query))) || [],
        species: ((_d = cache.get(species)) === null || _d === void 0 ? void 0 : _d.data.results.filter((spec) => spec.name.toLowerCase().includes(query))) || []
    };
    response.json(results);
});
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}.`);
});
