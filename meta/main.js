let data = [];

let commits = [];
let filteredCommits = [];
let selectedCommits = [];
let commitProgress = 100;

let svg, xScale, yScale, rScale, xAxis, yAxis, brush, timeScale;

let width = 600;
let height = 400;
let margin = { top: 10, right: 10, bottom: 30, left: 40 };
let usableArea = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
};

function initScatterplot() {
    svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height - margin.bottom})`);

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, 0)`);

    brush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on('brush end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`);

    svg.append('g')
        .attr('class', 'dots');

    xScale = d3.scaleTime()
        .range([margin.left, width - margin.right]);

    yScale = d3.scaleLinear()
        .range([margin.top, height - margin.bottom]);

    rScale = d3.scaleSqrt()
        .range([2, 30]);

    xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeWeek.every(1))
        .tickFormat(d3.timeFormat('%b %d'));

    yAxis = d3.axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
}

function updateScatterplot(newCommits) {
    xScale.domain(d3.extent(newCommits, d => d.datetime)).nice();
    yScale.domain([0, 24]);
    const [minLines, maxLines] = d3.extent(newCommits, d => d.totalLines);
    rScale.domain([minLines || 0, maxLines || 1]);

    svg.select('.x-axis')
        .call(xAxis);

    svg.select('.y-axis')
        .call(yAxis);

    svg.select('.gridlines')
        .call(
            d3.axisLeft(yScale)
                .tickFormat('')
                .tickSize(-(usableArea.right - usableArea.left))
        );

    svg.select('.dots')
        .selectAll('circle')
        .data(newCommits, d => d.id)
        .join(
            enter => enter
                .append('circle')
                .attr('fill', 'steelblue')
                .style('fill-opacity', 0.7)
                .call(applyCircleEvents),
            update => update
                .call(applyCircleEvents),
            exit => exit
                .remove()
        )
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines));
}

function applyCircleEvents(selection) {
    selection
        .on('mouseenter', function (event, c) {
            d3.select(this)
                .style('fill-opacity', 1)
                .classed('selected', isCommitSelected(c));

            updateTooltipContent(c);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', function (event, c) {
            d3.select(this)
                .style('fill-opacity', 0.7)
                .classed('selected', isCommitSelected(c));

            updateTooltipVisibility(false);
        });
}

function filterCommitsByTime() {
    let commitMaxTime = timeScale.invert(commitProgress);
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}

function brushed(event) {
    let brushSelection = event.selection;
    selectedCommits = !brushSelection
        ? []
        : commits.filter(commit => {
            let [[x0, y0], [x1, y1]] = brushSelection;
            let x = xScale(commit.datetime);
            let y = yScale(commit.hourFrac);
            return x >= x0 && x <= x1 && y >= y0 && y <= y1;
        });

    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}

function updateSelection() {
    svg.selectAll('circle')
        .classed('selected', d => isCommitSelected(d));
}

function updateSelectedTime() {
    let commitMaxTime = timeScale.invert(commitProgress);

    d3.select('#selectedTime')
        .text(commitMaxTime
            ? commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })
            : 'No commits available'
        );

    filterCommitsByTime();
    updateScatterplot(filteredCommits);
    updateFileVisualization();
}

function updateSelectionCount() {
    d3.select('#selection-count')
        .text(`${selectedCommits.length || 'No'} commits selected`);
}

function updateLanguageBreakdown() {
    let container = d3.select('#language-breakdown');
    if (selectedCommits.length === 0) {
        container.html('');
        return;
    }

    const lines = selectedCommits.flatMap(d => d.lines || []);
    const breakdown = d3.rollup(
        lines.filter(d => d.type),
        v => v.length,
        d => d.type
    );

    container.html('');
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        container
            .append('div')
            .html(`
                    <dt>${language}</dt>
                    <dd>${count} lines</dd>
                    <dd>(${formatted})</dd>
                 `);
    }
}

function displayStats() {
    let uniqueFiles = d3.group(data, d => d.file).size;
    let fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
    let avgFileLength = d3.mean(fileLengths, d => d[1]).toFixed(2);
    let activeHours = d3.rollup(commits, v => v.length, d => Math.floor(d.hourFrac));
    let peakHour = d3.greatest(activeHours, d => d[1])?.[0];

    const dl = d3.select('#stats')
        .append('dl')
        .attr('class', 'stats');

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

function updateTooltipContent(commit) {
    let tooltip = d3.select('#commit-tooltip');

    tooltip.select('#commit-link')
        .attr('href', commit.url)
        .text(commit.id);

    tooltip.select('#commit-date')
        .text(commit.datetime?.toLocaleString('en', { dateStyle: 'full' }));

    tooltip.property('hidden', false);
}

function updateTooltipVisibility(isVisible) {
    d3.select('#commit-tooltip')
        .property('hidden', !isVisible);
}

function updateTooltipPosition(event) {
    let offsetX = 15;
    let offsetY = 15;
    d3.select('#commit-tooltip')
        .style('left', (event.clientX + offsetX) + 'px')
        .style('top', (event.clientY + offsetY) + 'px');
}

function processCommits() {
    commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, datetime } = first;
        return {
            id: commit,
            url: `https://github.com/dallasplunkett/portfolio/commit/${commit}`,
            author,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
            lines,
        };
    });
}

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    processCommits();

    timeScale = d3
        .scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, 100]);

    filterCommitsByTime();
    displayStats();
    updateScatterplot(filteredCommits);
    updateSelectedTime();
}

document.addEventListener('DOMContentLoaded', async () => {
    initScatterplot();

    await loadData();

    d3.select('#commit-slider').on('input', function () {
        commitProgress = +this.value;
        updateSelectedTime();
    });
});

function updateFileVisualization() {
    let lines = filteredCommits.flatMap(d => d.lines);

    let files = d3.groups(lines, d => d.file)
        .map(([file, lines]) => ({
            name: file,
            lines
        }));

    files = d3.sort(files, d => -d.lines.length);

    d3.select('.files')
        .selectAll('div')
        .remove();

    let filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');

    filesContainer.append('dt')
        .html((d) => {
            return `
            <code>${d.name}</code>
            <small>${d.lines.length} lines</small>
            `;
        });

    let dd = filesContainer.append('dd');

    let fileTypeColors = d3.scaleOrdinal(d3.schemeCategory10);

    dd.selectAll('div')
        .data((d) => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', (line) => fileTypeColors(line.type));
}