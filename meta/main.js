let data = [];

let commits = [];
let filteredCommits = [];
let selectedCommits = [];

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

let itemsContainer;

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

function loadData() {
    d3.csv("loc.csv", (row) => ({
        ...row,
        line: +row.line,
        depth: +row.depth,
        length: +row.length,
        date: new Date(row.date + "T00:00" + row.timezone),
        datetime: new Date(row.datetime),
    }))
        .then((csvData) => {
            data = csvData;
            processCommits();
            commits.sort((a, b) => a.datetime - b.datetime);
            displayStats();
            updateScatterplot(commits);
            displayCommitFiles(commits);
            renderAllCommits();
            setupScrollTimeFilter();
        });
}

document.addEventListener('DOMContentLoaded', () => {
    initScatterplot();
    loadData();
});

function displayCommitFiles(commitList) {
    const lines = commitList.flatMap((d) => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
        return { name, lines };
    });

    files = d3.sort(files, (d) => -d.lines.length);

    d3.select('.files').selectAll('div').remove();

    let filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');

    filesContainer
        .append('dt')
        .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

    filesContainer
        .append('dd')
        .selectAll('div')
        .data((d) => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', (d) => fileTypeColors(d.type));
}

function renderAllCommits() {
    itemsContainer = d3.select("#items-container");
    itemsContainer.selectAll(".item").remove();

    itemsContainer
        .selectAll(".item")
        .data(commits)
        .enter()
        .append("div")
        .attr("class", "item")
        .html((commit, i) => {
            return `
            <p>
                On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })},
                I made 
                <a href="${commit.url}" target="_blank">
                ${i > 0 ? 'another commit' : 'my first commit, and it was glorious'}
                </a>.
                I edited ${commit.totalLines} lines across
                ${d3.rollups(commit.lines, (v) => v.length, (d) => d.file).length} files.
                Then I looked over all I had made, and I saw that it was very good.
            </p>
            `;
        });
}

function setupScrollTimeFilter() {
    const scrollContainer = d3.select('#scroll-container');

    scrollContainer.on('scroll', () => {
        const node = scrollContainer.node();
        let scrollTop = node.scrollTop;
        let maxScroll = node.scrollHeight - node.clientHeight;
        let fraction = maxScroll > 0 ? scrollTop / maxScroll : 1;

        let totalCount = commits.length;
        let countToShow = Math.floor(fraction * totalCount);
        let newCommits = commits.slice(0, countToShow);
        updateScatterplot(newCommits);
        displayCommitFiles(newCommits);
    });
}
