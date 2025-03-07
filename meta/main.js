let data = [];
let commits = [];
let xScale, yScale;
let brushSelection = null;
let selectedCommits = [];
let filteredCommits = [];
let timeScale;
let commitProgress = 100;

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

function displayStats() {
    let uniqueFiles = d3.group(data, d => d.file).size;
    let fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
    let avgFileLength = d3.mean(fileLengths, d => d[1]).toFixed(2);
    let activeHours = d3.rollup(commits, v => v.length, d => Math.floor(d.hourFrac));
    let peakHour = d3.greatest(activeHours, d => d[1])?.[0];

    const dl = d3
        .select('#stats')
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

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
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

function filterCommitsByTime() {
    let commitMaxTime = timeScale.invert(commitProgress);
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}

function updateScatterplot(filteredCommits) {
    const width = 600;
    const height = 400;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    d3.select('#chart').select('svg').remove();

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredCommits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.top, usableArea.bottom]);

    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const xAxis = d3
        .axisBottom(xScale)
        .ticks(d3.timeWeek.every(1))
        .tickFormat(d3.timeFormat('%b %d'));

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    brushSelector(svg);

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(filteredCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', function (event, c) {
            d3.select(event.currentTarget)
                .style('fill-opacity', 1)
                .classed('selected', isCommitSelected(c));

            updateTooltipContent(c);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', function (_, c) {
            d3.select(this)
                .style('fill-opacity', 0.7)
                .classed('selected', isCommitSelected(c));

            updateTooltipVisibility(false);
        });
}

function updateSelectedTime() {
    let commitMaxTime = timeScale.invert(commitProgress);

    d3.select('#selectedTime')
        .text(commitMaxTime
            ? commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })
            : "No commits available"
        );

    filterCommitsByTime();
    updateScatterplot(filteredCommits);
}

function updateTooltipContent(commit) {
    const tooltip = document.getElementById('commit-tooltip');
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });

    tooltip.hidden = false;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    const offsetX = 15;
    const offsetY = 15;

    tooltip.style.left = `${event.clientX + offsetX}px`;
    tooltip.style.top = `${event.clientY + offsetY}px`;
}

function brushed(event) {
    let brushSelection = event.selection;
    selectedCommits = !brushSelection
        ? []
        : commits.filter(commit => {
            let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
            let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
            let x = xScale(commit.datetime);
            let y = yScale(commit.hourFrac);

            return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
        });

    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function brushSelector(svg) {
    const brush = d3
        .brush()
        .extent([[0, 0], [600, 400]])
        .on("brush end", brushed);

    svg.append("g")
        .attr("class", "brush")
        .call(brush);
}

function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}

function updateSelection() {
    d3.selectAll('circle')
        .classed('selected', (d) => selectedCommits.includes(d));
}

function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines || []);
    const breakdown = d3.rollup(
        lines.filter(d => d.type),
        (v) => v.length,
        (d) => d.type
    );

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <div>
                <dt>${language}</dt>
                <dd>${count} lines</dd>
                <dd>(${formatted})</dd>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    d3.select('#commit-slider').on('input', function () {
        commitProgress = +this.value;
        updateSelectedTime();
    });
});
