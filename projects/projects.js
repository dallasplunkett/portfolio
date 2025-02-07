import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../lib/projects.json');

let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
);

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer);

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
}

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let arc = arcGenerator({
    startAngle: 0,
    endAngle: 2 * Math.PI,
});
d3.select('svg').append('path').attr('d', arc).attr('fill', 'red');

let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
});

let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));

let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, idx) => {
    d3.select('svg').append('path').attr('d', arc).attr('fill', colors(idx));
})

let legend = d3.select('.legend');
data.forEach((d, idx) => {
    legend.append('li')
        .attr('style', `--color:${colors(idx)}`)
        .html(`<span class="swatch" style=background-color:${colors(idx)}></span> ${d.label} <em>(${d.value})</em>`);
})
