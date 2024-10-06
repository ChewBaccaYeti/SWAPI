import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import {
    Character, ApiResponse_Character,
    Starship, ApiResponse_Starships,
    Specie, ApiResponse_Species,
    ExtendedRequest
} from './SWapiTypes';

const app = express();
const PORT = 3030;

// Endpoints
const people = 'https://swapi.dev/api/people';
const starships = 'https://swapi.dev/api/starships';
const species = 'https://swapi.dev/api/species';

const cache: Map<string, { data: any, expiration: number }> = new Map();
const CACHE_TTL = 60 * 60 * 1000;

app.use(cors());
// Serve static files from the directory
app.use(express.static(path.join(__dirname, '../')));
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

async function fetchWithCache<T>(url: string): Promise<T> {
    const now = Date.now();
    const cached = cache.get(url);

    if (cached && cached.expiration > now) {
        console.log(`Service from cache: ${url}`);
        return cached.data;
    }
    console.log(`Fetching fresh data: ${url}`);
    const response = await axios.get<T>(url);
    cache.set(url, { data: response.data, expiration: now + CACHE_TTL });
    return response.data;
};

// Middleware to fetch ALL data for designated endpoints below
async function fetchAllData<T>(url: string, limit: number): Promise<T[]> {
    let results: T[] = [];
    let nextUrl: string | null = url;

    while (nextUrl && results.length < limit) {
        const { next, results: newResults }: { next: string | null; results: T[] } = await fetchWithCache<{ next: string | null, results: T[] }>(nextUrl);
        // const response: { data: { next: string | null, results: T[] } } = await axios.get(nextUrl);
        results = results.concat(newResults); // Сшиваю данные между собой

        if (results.length >= limit) {
            results = results.slice(0, limit); // Обрезаю массив до определенного количества
            break; // Прерываю операцию
        } nextUrl = next; // Переход на следующий ендпоинт
    } return results;
}

// Middleware to fetch characters data from SWAPI
function fetchCharactersData(request: ExtendedRequest<ApiResponse_Character>, response: Response, next: NextFunction) {
    fetchAllData<Character>(`${people}`, 20)
        .then(characters => {
            request.swapiData = { count: characters.length, next: null, previous: null, results: characters };
            next();
        })
        .catch(function (error) {
            console.error('Error acquired during fetching characters from SWAPI.', error);
            response.status(500).send('Server error.');
        });
};

// Middleware to fetch starships data from SWAPI
function fetchStarshipsData(request: ExtendedRequest<ApiResponse_Starships>, response: Response, next: NextFunction) {
    fetchAllData<Starship>(`${starships}`, 20)
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
function fetchSpeciesData(request: ExtendedRequest<ApiResponse_Species>, response: Response, next: NextFunction) {
    fetchAllData<Specie>(`${species}`, 20)
        .then(species => {
            request.swapiData = { count: species.length, next: null, previous: null, results: species }
            next();
        })
        .catch(error => {
            console.error('Error acquired during fetching species from SWAPI.', error);
            response.status(500).send('Server error.');
        })
}

// Route to return the fetched data
app.get('/people', fetchCharactersData, (request: ExtendedRequest<ApiResponse_Character>, response: Response) => {
    response.json(request.swapiData)
});

app.get('/starships', fetchStarshipsData, (request: ExtendedRequest<ApiResponse_Starships>, response: Response) => {
    response.json(request.swapiData)
});

app.get('/species', fetchSpeciesData, (request: ExtendedRequest<ApiResponse_Species>, response: Response) => {
    response.json(request.swapiData)
});

// Тут заключена логика ручного поиска данных уже из кэша
app.get('/search', (request: ExtendedRequest<any>, response: Response) => {
    const query = request.query.q?.toString().toLowerCase() || '';

    if (!query) {
        return response.status(400).json({ error: 'Query parameter is required' });
    }

    const results = {
        characters: cache.get(people)?.data.results.filter((char: Character) =>
            char.name.toLowerCase().includes(query)) || [],
        starships: cache.get(starships)?.data.results.filter((ship: Starship) =>
            ship.name.toLowerCase().includes(query)) || [],
        species: cache.get(species)?.data.results.filter((spec: Specie) =>
            spec.name.toLowerCase().includes(query)) || []
    };
    response.json(results);
});

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}.`);
});