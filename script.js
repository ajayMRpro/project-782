const genreListElement = document.getElementById('genreList');
const searchInput = document.getElementById('searchInput');
const searchResultsSection = document.getElementById('searchResultsSection');
const searchResultsGrid = document.getElementById('searchResultsGrid');
const contentWrapper = document.querySelector('.content-wrapper');

const API_KEY = '5567eceb';
const BASE_URL = 'http://www.omdbapi.com/';

// Predefined Lists to populate the page
const LISTS = {
    marvel: [
        'Avengers: Endgame', 'Iron Man', 'Thor: Ragnarok', 'Black Panther', 'Doctor Strange',
        'Guardians of the Galaxy', 'Captain America: Civil War', 'Spider-Man: No Way Home',
        'Avengers: Infinity War', 'Black Widow', 'Eternals', 'Shang-Chi', 'Ant-Man', 'Deadpool'
    ],
    bollywood: [
        '3 Idiots', 'Dangal', 'RRR', 'Jawan', 'Pathaan', 'PK', 'Bajrangi Bhaijaan',
        'Sholay', 'Lagaan', 'Dilwale Dulhania Le Jayenge', 'Gully Boy', 'Queen', 'Drishyam', 'KGF Chapter 2'
    ],
    year2024: [
        'Dune: Part Two', 'Civil War', 'Godzilla x Kong', 'Kung Fu Panda 4', 'The Fall Guy',
        'Kingdom of the Planet of the Apes', 'Furiosa: A Mad Max Saga', 'Challengers',
        'Inside Out 2', 'Bad Boys: Ride or Die', 'A Quiet Place: Day One', 'Deadpool & Wolverine'
    ],
    upcoming: [
        'Mufasa: The Lion King', 'Captain America: Brave New World', 'The Fantastic Four: First Steps',
        'Thunderbolts*', 'Superman', 'Avatar 3', 'Blade', 'Tron: Ares', 'Mission: Impossible 8'
    ],
    action: [
        'The Dark Knight', 'Gladiator', 'Mad Max: Fury Road', 'John Wick', 'Die Hard',
        'Terminator 2', 'The Matrix', 'Inception', 'Top Gun: Maverick', 'Mission: Impossible - Fallout',
        'Logan', 'Casino Royale', 'Speed', 'The Bourne Identity'
    ]
};

const genres = [
    { id: 28, name: "Action", icon: "fa-fire" },
    { id: 12, name: "Adventure", icon: "fa-compass" },
    { id: 16, name: "Animation", icon: "fa-dragon" },
    { id: 35, name: "Comedy", icon: "fa-laugh-beam" },
    { id: 80, name: "Crime", icon: "fa-mask" },
    { id: 18, name: "Drama", icon: "fa-masks-theater" },
    { id: 10751, name: "Family", icon: "fa-users" },
    { id: 14, name: "Fantasy", icon: "fa-wand-magic-sparkles" },
];

async function init() {
    renderGenres();

    // Load all sections in parallel
    fetchAndRenderMovies(LISTS.upcoming, document.getElementById('upcomingGrid'));
    fetchAndRenderMovies(LISTS.marvel, document.getElementById('marvelGrid'));
    fetchAndRenderMovies(LISTS.bollywood, document.getElementById('bollywoodGrid'));
    fetchAndRenderMovies(LISTS.year2024, document.getElementById('year2024Grid'));
    fetchAndRenderMovies(LISTS.action, document.getElementById('actionGrid'));
}

async function fetchAndRenderMovies(titles, container) {
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading...</div>';

    const moviePromises = titles.map(title => fetchMovieData(title));
    const movies = await Promise.all(moviePromises);

    // Filter out any failed requests
    const validMovies = movies.filter(m => m && m.Response === 'True');
    renderMovies(validMovies, container);
}

// Search functionality
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    // Hide/Show main content logic
    if (query.length > 0) {
        // Hide all default sections
        document.querySelectorAll('.movie-section:not(#searchResultsSection), .category-section').forEach(el => el.style.display = 'none');
        searchResultsSection.style.display = 'block';
    } else {
        // Show all default sections
        document.querySelectorAll('.movie-section, .category-section').forEach(el => el.style.display = 'block');
        searchResultsSection.style.display = 'none';
        return;
    }

    if (query.length < 3) return;

    searchTimeout = setTimeout(async () => {
        const results = await searchMovies(query);
        renderMovies(results, searchResultsGrid);
    }, 500);
});

async function fetchMovieData(title) {
    try {
        const res = await fetch(`${BASE_URL}?t=${encodeURIComponent(title)}&apikey=${API_KEY}`);
        return await res.json();
    } catch (error) {
        console.error('Error fetching movie:', error);
        return null;
    }
}

async function searchMovies(query) {
    try {
        // Fetch pages 1 to 5 concurrently
        const pagePromises = [1, 2, 3, 4, 5].map(page =>
            fetch(`${BASE_URL}?s=${encodeURIComponent(query)}&apikey=${API_KEY}&page=${page}`)
                .then(res => res.json())
        );

        const pageResults = await Promise.all(pagePromises);

        // Combine all results
        let allMovies = [];
        pageResults.forEach(data => {
            if (data.Response === "True" && data.Search) {
                allMovies = allMovies.concat(data.Search);
            }
        });

        // Remove duplicates based on imdbID
        const uniqueMovies = Array.from(new Set(allMovies.map(m => m.imdbID)))
            .map(id => allMovies.find(m => m.imdbID === id));

        if (uniqueMovies.length > 0) {
            const detailPromises = uniqueMovies.map(movie => fetchMovieDetailsById(movie.imdbID));
            const detailedMovies = await Promise.all(detailPromises);
            const validMovies = detailedMovies.filter(m => m && m.Response === 'True');

            // Sort by Year (descending) and then Rating (descending)
            return validMovies.sort((a, b) => {
                // Parse Year (handle "2022–" etc)
                const yearA = parseInt(a.Year) || 0;
                const yearB = parseInt(b.Year) || 0;
                if (yearB !== yearA) {
                    return yearB - yearA;
                }

                // Parse Rating (handle "N/A")
                const ratingA = parseFloat(a.imdbRating) || 0;
                const ratingB = parseFloat(b.imdbRating) || 0;
                return ratingB - ratingA;
            });
        }
        return [];
    } catch (error) {
        console.error('Error searching:', error);
        return [];
    }
}

async function fetchMovieDetailsById(imdbID) {
    try {
        const res = await fetch(`${BASE_URL}?i=${imdbID}&apikey=${API_KEY}`);
        return await res.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

function renderGenres() {
    genreListElement.innerHTML = genres.map(genre => `
        <div class="genre-card" onclick="handleGenreClick('${genre.name}')">
            <p>${genre.name}</p>
        </div>
    `).join('');
}

window.handleGenreClick = async function (genreName) {
    // Update search bar
    searchInput.value = genreName;

    // Toggle sections
    document.querySelectorAll('.movie-section:not(#searchResultsSection), .category-section').forEach(el => el.style.display = 'none');
    searchResultsSection.style.display = 'block';

    // Show loading
    searchResultsGrid.innerHTML = '<div class="loading">Finding ${genreName} movies...</div>';

    // Search and render
    const results = await searchMovies(genreName);
    renderMovies(results, searchResultsGrid);
}

window.handleNav = function (category) {
    // Update active class
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'home') {
        // Show defaults
        document.querySelectorAll('.movie-section:not(#searchResultsSection), .category-section').forEach(el => el.style.display = 'block');
        searchResultsSection.style.display = 'none';
        searchInput.value = '';
    } else if (category === 'movies') {
        // Scroll to Movies/Upcoming
        document.getElementById('upcomingGrid').scrollIntoView({ behavior: 'smooth' });
    } else if (category === 'series') {
        // Search for series
        searchInput.value = 'Series';
        const event = new Event('input');
        searchInput.dispatchEvent(event);
    } else if (category === 'mylist') {
        alert('My List feature coming soon!');
    }
}

function renderMovies(movies, container) {
    if (!container) return;

    if (movies.length === 0) {
        container.innerHTML = '<p class="no-results">No movies found</p>';
        return;
    }

    container.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.open('https://www.imdb.com/title/${movie.imdbID}', '_blank')">
            <div class="poster-container">
                <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.Title}">
            </div>
            <div class="movie-info">
                <div>
                    <h3 class="movie-title">${movie.Title}</h3>
                    <p class="movie-genre">${movie.Genre || ''}</p>
                </div>
                <p class="movie-desc">${movie.Plot || ''}</p>
                <div class="movie-meta-row">
                    <span>${movie.Year}</span>
                    <span class="rating"><i class="fa-solid fa-star"></i> ${movie.imdbRating || 'N/A'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

init();
