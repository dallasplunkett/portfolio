import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');

renderProjects(latestProjects, projectsContainer, 'h2');

const githubData = await fetchGitHubData('dallasplunkett');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
        <dl>
            <div>
                <dt>PUBLIC REPOS</dt>
                <dd>${githubData.public_repos}</dd>
            </div>
            <div>
                <dt>PUBLIC GISTS</dt>
                <dd>${githubData.public_gists}</dd>
            </div>
            <div>
                <dt>FOLLOWERS</dt>
                <dd>${githubData.followers}</dd>
            </div>
            <div>
                <dt>FOLLOWING</dt>
                <dd>${githubData.following}</dd>
            </div>
        </dl>
    `;
}