console.log('IT’S ALIVE!');

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
        a.rel = 'noopener noreferrer';
    }

    nav.appendChild(a)
}

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