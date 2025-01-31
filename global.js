// HELPER

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
};

let pages = [
    { url: '', title: 'Home' },
    { url: 'contact/', title: 'Contact' },
    { url: 'projects/', title: 'Projects' },
    { url: 'cv/', title: 'CV' },
    { url: 'https://github.com/dallasplunkett', title: 'GitHub' },
];

// CONSTRUCT NAVIGATION

let nav = document.createElement('nav');
document.querySelector(".container").prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }

    if (a.host !== location.host) {
        a.target = '_blank';
    }

    nav.appendChild(a);
}

// CONSTRUCT THEME PICKER

document.querySelector('.container').insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">Theme:
        <select>
            <option value="auto">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

let select = document.querySelector('select');
const savedTheme = localStorage.getItem('colorScheme') || 'auto';

if (savedTheme === 'light') {
    document.documentElement.style.setProperty('color-scheme', 'light');
} else if (savedTheme === 'dark') {
    document.documentElement.style.setProperty('color-scheme', 'dark');
} else {
    document.documentElement.style.removeProperty('color-scheme');
}

select.value = savedTheme;

select.addEventListener('input', function (event) {
    const theme = event.target.value;

    if (theme === 'light') {
        document.documentElement.style.setProperty('color-scheme', 'light');
    } else if (theme === 'dark') {
        document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
        document.documentElement.style.removeProperty('color-scheme');
    }

    localStorage.setItem('colorScheme', theme);
});

// CONSTRUCT CONTACT FORM

if (window.location.pathname === '/contact') {
    let form = document.querySelector('form');

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const data = new FormData(form);
        let params = [];

        for (let [name, value] of data) {
            params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
        }

        const queryString = params.join('&');
        const mailtoLink = `mailto:dmplunkett@ucsd.edu?${queryString}`;
        window.location.href = mailtoLink;
    });
}

// GET PROJECT JSON DATA

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

// ADD PROJECTS INTO A CONTAINER

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement || !(containerElement instanceof HTMLElement)) {
        console.error('Invalid container element provided.');
        return;
    }

    const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (!validHeadingLevels.includes(headingLevel)) {
        console.warn(`Invalid heading level: ${headingLevel}. Defaulting to 'h2'.`);
        headingLevel = 'h2';
    }

    containerElement.innerHTML = '';

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];

        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title || 'Project image not found.'}">
            <p>${project.description || 'No description found.'}</p>
        `;

        containerElement.appendChild(article);
    }
}

// FETCH GITHUB DATA

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}