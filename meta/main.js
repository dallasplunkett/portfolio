let data = [];
let commits = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    displayStats();
    createScatterplot();
}

function displayStats() {
    processCommits();

    let uniqueFiles = d3.group(data, d => d.file).size;

    let fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
    let avgFileLength = d3.mean(fileLengths, d => d[1]).toFixed(2);

    let activeHours = d3.rollup(commits, v => v.length, d => Math.floor(d.hourFrac));
    let peakHour = d3.greatest(activeHours, d => d[1])?.[0];

    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Helper function to wrap each stat in a div
    function addStat(label, value) {
        const div = dl.append('div');
        div.append('dt').text(label);
        div.append('dd').text(value);
    }

    addStat('TOTAL LINES', data.length);
    addStat('NUMBER OF FILES', uniqueFiles);
    addStat('AVG FILE LENGTH', avgFileLength);
    addStat('PEAK COMMIT HOUR', `${peakHour}:00`);
}

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: `https://github.com/dallasplunkett/portfolio/commit/${commit}`,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false
            });

            return ret;
        });
}

function createScatterplot() {

    const width = 1000;
    const height = 600;
    const margin = {
        top: 10,
        right: 10,
        bottom: 30,
        left: 40
    };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.top, usableArea.bottom]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)
    );

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event); // Move tooltip with cursor
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);
        });
}

function updateTooltipContent(commit) {
    const tooltip = document.getElementById('commit-tooltip');
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');

    // if (!commit || Object.keys(commit).length === 0) {
    //     tooltip.hidden = true; // Hide tooltip when no commit
    //     return;
    // }

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });

    tooltip.hidden = false; // Show tooltip when there's content
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    // Offset so tooltip isn't directly under cursor
    const offsetX = 15;
    const offsetY = 15;

    tooltip.style.left = `${event.clientX + offsetX}px`;
    tooltip.style.top = `${event.clientY + offsetY}px`;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});
