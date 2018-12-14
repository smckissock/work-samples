//let dateChart;
let mediaOutletChart;

let searchDim;
let tableDim;
let searchGroup;
let dateDim;

let all;
let allStoryCount;

let months;

var searchTerm = "";
var cleanSearchTerm = ""

let terms;
let stories;
let storiesFact;
let termsDim;
let termsGroup;

let svgWidth = 650;
let storyWidth = 300;
let graphSvg;

let mediaList;

let selectedStory = null;
let selectedCircle = null;

let selectedTerm = null;

d3.json("data/news.json", function (err, data) {
    terms = data.terms;
    terms.forEach(function (term) {
        term.lower = term.name.toLowerCase();
    });

    months = makeMonths();
    months.forEach(m => { console.log(); });

    // From http://www.people-press.org/2014/06/12/section-1-growing-ideological-consistency/
    // TinEye
    const biasColors = [
        '',         // 0 
        'white',    // Unspecified
        '#335064',  // Left
        '#84a4ba',  // Center left   
        '#4e4656',  // Center
        '#bfc0c1',  // Mixed 
        '#e48175',  // Center Right
        '#923024'   // Right
    ];    

    data.stories.forEach(function (d) {
        let parts = d.date.split("/");
        d.dateSort = parts[2] + "-" + parts[0].padStart(2, '0') + "-" + parts[1].padStart(2, '0');

        let year = Number(parts[2]);
        let month = Number(parts[0]);
        d.monthNum = ((year - 2013) * 12) + month;
        d.dateObject = new Date(d.date);

        d.color = biasColors[d.biasRatingId];
    });

    //console.table(data.stories);
    console.table(data.media);

    mediaList = data.media;
    stories = data.stories;
    allStoryCount = stories.length;

    storiesFact = crossfilter(data.stories);
    all = storiesFact.groupAll();
    
    
    termsDim = storiesFact.dimension(d => { return d.termIds; });
    termsGroup = termsDim.group().reduceCount();

    dateDim = storiesFact.dimension(function (d) { return d.monthNum; });
    let dateGroup = dateDim.group().reduceCount(function (d) { return d.monthNum; });
    dateChart = dc.barChart("#dc-chart-date")
        .dimension(dateDim)
        .group(dateGroup)
        .x(d3.scale.linear().domain([4, (12 * 6)]))
        .centerBar(true)
        .width(dateChartWidth())
        .height(110)
        .margins({ top: 10, right: 20, bottom: 20, left: 42 })
        .ordinalColors(['#9ecae1'])
        .yAxisLabel('# Media Accounts')
        .on('filtered', showFilters)
        .elasticY(true)

    dateChart.yAxis().ticks(3);
    dateChart.xAxis().ticks(4);

    dateChart.xAxis().tickFormat(function (d) {
        return months[d].year + " " + months[d].quarter;
    });  

 
    /* var dimMonthYear = storiesFact.dimension(function(d) {
        return d3.time.month(d.dateObject)
      });      
    var groupMonthYear = dimMonthYear.group().reduceSum(function (d) { return d.count; });
    
    let timeChart = dc.barChart("#dc-chart-date")
        .width(dateChartWidth())
        .height(110)
        .dimension(dimMonthYear)
        .group(groupMonthYear)
        .transitionDuration(500)
        .centerBar(true)
        .margins({top: 30, right: 50, bottom: 25, left: 40})
        .yAxisLabel('# Media Accounts')
        .on('filtered', showFilters)
        .x(d3.time.scale()).elasticX(true)
        .round(d3.time.month.round)
        .alwaysUseRounding(true)
        .xUnits(d3.time.months) */


    d3.select("#search-input").on('keyup', function (event) {
        searchTerm = document.getElementById("search-input").value;
        setWord(searchTerm);
    });

    let col1Width = 200;
    mediaOutletChart = new RowChart(storiesFact, "mediaOutlet", col1Width, 40);

    /* dataTable = dc.dataTable("#dc-chart-dataGrid"); */
    tableDim = storiesFact.dimension(function (d) { return d.id; });
    /*
    dataTable
        .dimension(tableDim)
        .group(d => storyHtml(d))
        .sortBy(d => { return d.dateSort; })
        .size(100)
        .order(d3.descending); */

    addSvg();

    
    d3.select("body")
        .on("keydown", function() {
            graphSvg.append("text")
                .attr("x","5")
                .attr("y","150")
                .style("font-size","50px")
                .text("keyCode: " + d3.event.keyCode)  
            .transition().duration(2000)
                .style("font-size","5px")
                .style("fill-opacity",".1")
                .remove();
    });
    

    dc.renderAll();

    let term = getExampleTerms();
    setExampleSearch(term);

    showFilters();

    document.getElementById("search-input").focus();
});

function addSvg() {
    graphSvg = d3.select("#svg-chart")
        .append("svg")
        .attr("width", svgWidth + 3)
        .attr("height", 700);
}


function dateChartWidth() {
    return window.innerWidth > svgWidth ? svgWidth : window.innerWidth - 220
}

function resize() {
    dateChart.width(dateChartWidth());
    dc.redrawAll();
}

function setFocus() {
    document.getElementById('search-input').focus();
}


// They clicked on an example. If this gives a single result - as it usually will - don't 
// show list of choices, just put the term in the search box and show the results for that term
// If there is more than one results, show the list  
function setExampleSearch(term) {
    d3.select("#search-input")
        .attr("value", term);

    cleanSearchTerm = term.toLowerCase();
    let matchedTerms = terms.filter(x => { return x.lower.indexOf(cleanSearchTerm) !== -1 });

    if (matchedTerms.length == 0) {
        alert("No entities found for " + cleanSearchTerm + "? WTF?");
    }

    // If there is only one result, "click" it 
    if (matchedTerms.length == 1) {
        showStories(matchedTerms[0].id)
    } else {
        setWord(term);
    }
}

// Changes the list of terms, they need to select term to refresh stories 
function setWord(word) {
    searchTerm = word;
    cleanSearchTerm = word.toLowerCase();
    
    let matchedTerms = [];
    if (word.length > 2) 
        matchedTerms = terms.filter(x => { return x.lower.indexOf(cleanSearchTerm) !== -1 });

    document.getElementById("results-box").innerHTML = searchTermsHtml(matchedTerms);
}

// When they click on a search term 
function showStories(id) {
    selectedTerm = t = terms.filter(term => { return term.id == id })[0];
    termsDim.filter(d => { return d.indexOf(id) !== -1 });
    dc.redrawAll();
    
    showFilters();
    document.getElementById("results-box").innerHTML = searchTermsHtml([]);
}

function drawGraph() {
    
    const mediaY = {};
    const rowHeight = 30;

    function drawMediaLabels() {
        graphSvg.attr("height", (medias.length * rowHeight) + 20);
        
        let y = 18;
        medias.forEach(function(media) {
            mediaY[media.name] = y;
            y += rowHeight;
        });

        graphSvg.selectAll("text")
            .data(medias)
            .enter()
            .append("text")
                .text(d => d.name)
                .attr({
                    x: 3
                    , y: d => mediaY[d.name] 
                    , class: "mediaLabel"
                });
    }

    function drawStories() {
    
        function storyRadius(wordCount) {
            if (wordCount < 500)
                return 8;
            if (wordCount < 1000)
                return 10;
            if (wordCount < 1500)
                return 12;
            return 13.5;    
        }    

        graphSvg.selectAll("circle")
            .data(stories)
            .enter()
            .append("circle")
                .attr({
                    fill: "black"            
                })
                .on('click', function (d) {
                    storyClick(this, d);
                })
                .on('mouseover', function (d) {
                    d3.select(this)
                        .attr({
                            fill: "black"            
                        })
                        storySelect(d);
                        //.style('fill-opacity', .9)
                        //.attr("stroke", "black")
                        //.attr("stroke-width", 2);
                })
                .on('mouseout', function (d) {
                    let fillColor = d.color;    
                    if (d == selectedStory)
                        fillColor = "black";

                    d3.select(this)
                        .attr({
                            fill: fillColor
                        });
                        storyDeselect(d);
                })
                .attr("r", 0)
                //.style("fill-opacity", 0)
                .transition()
                .duration(500)
                .attr({
                    cx: function(d, i) { return dateScale(d.dateObject) + 20}
                    , cy: d => mediaY[d.mediaOutlet] - 4
                    , r: d => storyRadius(d.wordCount)
                    , fill: d => d.color
                    , stroke: "black"
                    , strokeWidth: 1
                })
                .style("fill-opacity", 1);
        }

        function drawHorizontalLines() {
            graphSvg.selectAll("line")
                .data(stories)
                .enter()
                .append("line")
                .attr("class", "mediaLine")
                .attr({
                    x1: 0
                    , y1: function(d, i) { return 29 + (i * rowHeight)}
                    , x2: svgWidth
                    , y2: function(d, i) { return 29 + (i * rowHeight)}
                });
        }

        function drawDateAxis() {
            const xAxis = d3.svg.axis()
                .orient("bottom")
                .scale(dateScale)
                .ticks(7);

            graphSvg.append("g")
                .attr("transform", "translate(10," + ((rowHeight * medias.length)) + ")")
                .attr("class", "dateAxis")
                .call(xAxis);
        }

    // Start drawGraph
    const mediaNames = 
        mediaOutletChart.data()
            .filter(x => x.value > 0)
            .map(x => x.key);
    let medias = mediaList.filter(x => mediaNames.indexOf(x.name) > -1);
    console.table(medias);
            
    const stories = tableDim.top(10000);

    if (stories[0])
        d3.select("#story-box").html(storyDetailsHtml(stories[0]));

    const dates = stories.map(x => x.dateObject);
    const dateScale = d3.time.scale()
        .domain([d3.min(dates, d => d), d3.max(dates, d => d)])
        .range([130, svgWidth - 35]); 

    graphSvg.selectAll("*").remove();
    drawMediaLabels();
    drawStories();
    drawHorizontalLines();
    drawDateAxis();
}

function storyClick(circle, story) {
    // If a story is already selected, color it blue 
    if ((selectedCircle != circle) && (selectedCircle)) 
        selectedCircle.setAttribute("fill", selectedStory.color)
        
    selectedCircle = circle;
    selectedStory = story;
    let html = storyDetailsHtml(selectedStory);
    d3.select("#story-box").html(html);
}

function storySelect(story) {
    let html = storyDetailsHtml(story);
    d3.select("#story-box").html(html);
}

function storyDeselect(story) {
    if (selectedStory)
        d3.select("#story-box").html(storyDetailsHtml(selectedStory));
    else
        d3.select("#story-box").html("<p class='no-story'>No story selected (click circle)</p>");
}

function showFilters() {
    
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    d3.select("#count-box").text(numberWithCommas(all.value()) + " out of " + numberWithCommas(allStoryCount) + " stories");
   
    let filterStrings = [];
    if (selectedTerm)
        filterStrings.push(selectedTerm.name);
    let charts = dc.chartRegistry.list();
    charts.forEach(function (chart) {
        chart.filters().forEach(function (filter) {
            // Ugh, don't include date range for now, because I can't figure out how to get to underlying dates
            if (!Array.isArray(filter))
                filterStrings.push(filter);
        })
    })

    let filterString = filterStrings.join(', ');
    let filterDiv = document.getElementById("filter-box");
    if (filterString)
        d3.select("#filter-box").text(filterString);
    
    // Clear selected story whenever filters change (I guess?)
    clearStory();
    drawGraph();
}

function clearStory() { 
    selectedStory = null;
    selectedCircle = null;
    storyDeselect();
}

// Show search terms with chars they typed 
function searchTermsHtml(matchedTerms) {

    function typeHtml(term) {
        return `<div class="term-type">${term.type}</div>`;
    }

    function resultHtml(term) {
        let firstChar = term.lower.indexOf(cleanSearchTerm);
        let bolded = insert(term.name, firstChar + cleanSearchTerm.length, "</span>");
        bolded = insert(bolded, firstChar, "<span class='selected-term'>");

        return `<div class="term-result" onclick="showStories(${term.id})">${bolded}</div>`;
    }

    let html = "";
    let type = "";
    matchedTerms.forEach(function (term) {
        if (type != term.type) {
            html += typeHtml(term)
            type = term.type;
        }
        html += resultHtml(term);
    });

    toggleChartVisible(html != "");
    return html;
}

function toggleChartVisible(hide) {
    let display = "block";
    if (hide)
        display = "none";
    d3.select("#story-box").style("display", display);
    //d3.select("#dc-chart-date").style("display", display);
    //d3.select("#summary-box").style("display", display);
    //d3.select("#svg-chart").style("display", display);
}

function storyDetailsHtml(story) {

    function date(date) {
        return formatDate(date);
    }

    function outlet(mediaOutlet) {
        return mediaOutlet;
    }

    function headline(headline) {
        if (headline != "")
            return headline;
        else
            return "";
    }

    function image(d) {
        return d.image;
    }

    // Put in link
    function author(author, authorUrl) {
        if (author)
            return "by " + author;
        return "";
    }

    function getSentence(sentences) {
        let result = "";

        if (searchTerm.length < 3)
            return "";

        sentences.forEach(function (sentence) {
            var lower = sentence.toLowerCase();
            if (lower.includes(cleanSearchTerm)) {
                let start = lower.indexOf(cleanSearchTerm);
                let answer = insert(sentence, start + searchTerm.length, "</span>");
                answer = insert(answer, start, "<span class='selected-term'>");
                result = '"' + answer + '"';
            }
        });
        return result;
    }

    function getTermString(story) {
        if (story.terms === undefined) {
            let list = ""
            story.termIds.forEach(function (id) {
                let t = terms.filter(term => { return term.id == id });
                if (t.length > 0)
                    list += t[0].name + " ";
            })
            story.terms = list;
        }
        return story.terms;
    }

    function getTermLinksHtml(story) {

        function typeHtml(term) {
            return `<div class="related-term-type">${term.type}</div>`;
        }

        function resultHtml(term) {
            return `<div class="related-term-result" onclick="showStories(${term.id})">${term.name}</div>`;
        }

        let termList = [];
        story.termIds.forEach(function (id) {
            let matches = terms.filter(term => { return term.id == id });
            if (matches.length > 0)
                termList.push(matches[0]);
        });

        let html = "";
        let type = "";
        termList.forEach(function (term) {
            if (type != term.type) {
                html += typeHtml(term)
                type = term.type;
            }
            html += resultHtml(term);
        });

        return html;
        termList.forEach(d => console.log(d.type + " " + d.name));
    }

    //getTermLinksHtml(story);
    return `
        <div class="story-result" ${story.dateSort} onclick="window.open('${story.link}')">
            <p class="story-date">${date(story.dateObject)}</p>
            <p class="story-outlet">${outlet(story.mediaOutlet)}</p>
            <img class="story-image" src=${image(story)} onerror="this.style.display='none'" height="190" width="270">
            <p class="story-headline">${headline(story.headline)}</p>
            <p class="story-author">${author(story.author, story.authorUrl)}</p>
            <p class="story-excerpt">${getSentence(story.sentences)}</p>
            <p>${getTermLinksHtml(story)}</p>
        </div>
    `;
    // <p class="story-excerpt">${getTermString(story)}</p> 
}


function formatDate(date) {
    var monthNames = [
      "January", "February", "March",
      "April", "May", "June", "July",
      "August", "September", "October",
      "November", "December"
    ];
  
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();
  
    return monthNames[monthIndex] + ' ' + day + ", " + year;
  }
  

function refreshExamples() {
    d3.select("#search-input")
        .attr("value", "");
    cleanSearchTerm = "";
    searchTerm = "";
    toggleChartVisible(true)
    clearStory();

    setExampleSearch(getExampleTerms());
}


// Gets a new list of random  examples and renders them. Returns the first item, which will always have a single associated term. 
function getExampleTerms() {

    let examples =
        ["Rob Goldstone", "Comey", "McGahn", "Helsinki", "Sater", "Butina", "Veselnitskaya",
            "Sergey Kislyak", "Wikileaks", "Magnitsky", "Corey Lewandowski", "John Podesta", "Claire McCaskill", "Devin Nunes", "Rinat Akhmetshin"]

    // Examples without stories!!        
    // "CrowdStrike", "Mandiant", "Kaspersky" "Prague"

    let picked = new Set();
    while (picked.size < 7)
        picked.add(examples[Math.floor(Math.random() * examples.length)]);
    let terms = Array.from(picked);

    document.getElementById("examples-div").innerHTML = `
    <span onclick="refreshExamples()">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="-2 -3 18 18">
        <path d="M9 13.5c-2.49 0-4.5-2.01-4.5-4.5S6.51 4.5 9 4.5c1.24 0 2.36.52 3.17 1.33L10 8h5V3l-1.76 1.76C12.15 3.68 10.66 3 9 3 5.69 3 3.01 5.69 3.01 9S5.69 15 9 15c2.97 0 5.43-2.16 5.9-5h-1.52c-.46 2-2.24 3.5-4.38 3.5z"/>
    </svg>
    </span>	 
    <span class="example-label">Click a sample: </span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[0]}')">${terms[0]}</a></span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[1]}')">${terms[1]}</a></span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[2]}')">${terms[2]}</a></span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[3]}')">${terms[3]}</a></span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[4]}')">${terms[4]}</a></span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[5]}')">${terms[5]}</a></span>
    <span><a class="search-example" href="javascript:setExampleSearch('${terms[6]}')">${terms[6]}</a></span>
    `;

    return terms[0];
}

function insert(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}

function clearAll() {
    searchDim.filter(null); // clear text too?
    document.getElementById("search-input").value = "";

    dc.filterAll();
    dc.renderAll();
}

function makeMonths() {
    const monthDefs = [
        { month: "Jan", qtr: 1 }, { month: "Feb", qtr: 1 }, { month: "Mar", qtr: 1 },
        { month: "Apr", qtr: 2 }, { month: "May", qtr: 2 }, { month: "Jun", qtr: 2 },
        { month: "Jul", qtr: 3 }, { month: "Aug", qtr: 3 }, { month: "Sep", qtr: 3 },
        { month: "Oct", qtr: 4 }, { month: "Nov", qtr: 4 }, { month: "Dec", qtr: 4 }
    ];

    let months = []
    let year = 2013;
    let monthId = 1;
    while (year < 2020) {
        monthDefs.forEach(function (m) {
            let month = {};
            month.monthId = monthId;
            month.year = year;
            month.quarter = "Q" + m.qtr;
            month.month = m.month

            months.push(month);
            monthId++;
        });
        year++;
    }
    return months;
}

var RowChart = function (facts, attribute, width) {
    this.dim = facts.dimension(dc.pluck(attribute));
    let items = this.dim.group().size();
    let height = items * 22;

    let chart = dc.rowChart("#dc-chart-" + attribute)
        .dimension(this.dim)
        .group(this.dim.group().reduceCount())
        .data(function (d) { return d.top(10000); })
        .width(width)
        .height(height)
        .margins({ top: 60, right: 0, bottom: 10, left: 20 })
        .elasticX(true)
        .ordinalColors(['#9ecae1']) // light blue
        .labelOffsetX(5)
        .on('filtered', showFilters)
        .label(d => d.key);

    // Hacky way to hide x-axis    
    chart.xAxis().tickFormat(function (v) { return ""; });
    chart.xAxis().ticks(0);

    return chart;
}



// Was used with table listing
/* function storyHtml(story) {

    function headline(date, mediaOutlet, headline) {
        let txt = date;
        if (headline != "")
            return date + " " + mediaOutlet + " - " + headline;
        else
            return date + " " + mediaOutlet;
    }

    function getSentence(sentences) {
        let result = "Not Found";

        if (searchTerm.length < 3)
            return "";

        sentences.forEach(function (sentence) {
            var lower = sentence.toLowerCase();
            if (lower.includes(cleanSearchTerm)) {
                let start = lower.indexOf(cleanSearchTerm);
                let answer = insert(sentence, start + searchTerm.length, "</span>");
                answer = insert(answer, start, "<span class='selected-term'>");
                result = '"' + answer + '"';
            }
        });
        return result;
    }

    function getTermString(story) {
        if (story.terms === undefined) {
            let list = ""
            story.termIds.forEach(function (id) {
                let t = terms.filter(term => { return term.id == id });
                if (t.length > 0)
                    list += t[0].name + " ";
            })
            story.terms = list;
        }
        return story.terms;
    }

    return `
        <div class="story-result" ${story.dateSort} onclick="window.open('${story.link}')">
            <p class="story-headline">${headline(story.date, story.mediaOutlet, story.headline)}</p>
            <p class="story-excerpt">${getSentence(story.sentences)}</p>
            <p class="story-excerpt">${getTermString(story)}</p>
        </div>
    `;
} */


