var socket = io();
var time_ary = [],
    date_ary = [],
    val_ary = [];
var obj = [];
var keyword = '',
    sug_kw = '',
    url = '',
    dateClicked, startDate, endDate;
var suggestions;

window.addEventListener('resize', (e) => {
    removeAllChildNodes(document.getElementById('trendsChart'));
    draw(time_ary, val_ary);
});

const container = document.getElementById('ACdiv');
const searchbar = document.getElementById('searchbar');
const metrics   = document.getElementById('metrics');
const home = document.getElementById('home');
const priv = document.getElementById('privacy');
const rss = document.getElementById('rssFeed');

$('form').submit(function(ev) {
    ev.preventDefault(); // prevents page reloading!!!
    if ($('#searchbar').val().length !== 0) {
        socket.emit('search', $('#searchbar').val());
        socket.emit('relatedSearch', $('#searchbar').val());
        removeAllChildNodes(container);
        removeAllChildNodes(metrics);
        removeAllChildNodes(home);
        metrics.style.opacity = '0';
    }
    return false;
});

searchbar.oninput = function() {
    if (searchbar.value.length !== 0) {
        getSuggestions(searchbar.value);
    } else {
        removeAllChildNodes(container);
    }
}
socket.on('privacy', (obj) => {
    let privacy = obj.ary;
    updateTags(priv, 'ONLINE PRIVACY TOPICS', privacy);
});

socket.on('dailyTrends', (obj) => {
    let trending = obj.ary;
    updateTags(home, '📈 SEARCH TRENDS TODAY', trending);
});

socket.on('relatedTopics res', (obj) => {
    let related = obj.ary;
    updateTags(home, 'RELATED TOPICS', related);
});

socket.on('redeploy', () => {
    alert('Google caught us web-scraping, ' +
        '\nwe are working on fixing that.' +
        '\nPlease try again in 3 minutes.');
});

function updateTags(el, titleStr, ary) {
    removeAllChildNodes(el);
    let html = `<span>${titleStr}</span>`;
    el.innerHTML = html;
    for (var i = 0; i < ary.length; i++) {
        let pop = document.createElement('pop');
        pop.innerText = ary[i];
        pop.addEventListener('click', (e) => {
            socket.emit('search', (pop.innerText));
            socket.emit('relatedSearch', (pop.innerText));
            searchbar.value = pop.innerText;
        });
        el.appendChild(pop);
    }
}

socket.on('sugRes', (obj) => {
    suggestions = obj.res;
    removeAllChildNodes(container);
    var items = document.createElement('div');
    items.setAttribute('class', 'autocomplete-items-cont');
    container.appendChild(items);

    for( var i = 0; i < suggestions.length; i++) {
        var item = document.createElement('div');
        item.setAttribute('class', 'autocomplete-item');
        item.setAttribute('id', `${i}sug`);
        items.appendChild(item);
        item.innerHTML = `${suggestions[i].title}  <lite>${suggestions[i].type}</lite>`;

        item.addEventListener('click', (e) => {
            let index = parseInt(e.target.getAttribute('id'));
            socket.emit('search', (suggestions[index].mid));
            socket.emit('relatedSearch', (suggestions[index].title));
            sug_kw = suggestions[index].title;
            let container = document.getElementById('ACdiv');
            searchbar.value = sug_kw;
            removeAllChildNodes(container);
        });
    }
});

socket.on('sugErr', (obj) => {
    console.log(obj.error);
});

socket.on('search results', (results) => {
    var kw = (results.keyword).startsWith('/') ? sug_kw : results.keyword;
    keyword = results.keyword;
    time_ary = results.time_ary;
    val_ary = results.val_ary;
    document.getElementById('keyword').innerHTML = `☝ CLICK ON THE GOOGLE TREND GRAPH TO LEARN MORE ABOUT <kw-var>${kw.toUpperCase()}</kw-var> IN THAT TIME PERIOD.`;
    removeAllChildNodes(document.getElementById('trendsChart'));
    removeAllChildNodes(document.getElementById('rssFeed'));
    draw(time_ary, val_ary);
});

socket.on('fetchRes', (res) => {
    removeAllChildNodes(rss);
    var kw = (keyword).startsWith('/') ? sug_kw : keyword;
    document.getElementById('keyword').innerHTML =
        'INDEXES & NEWS ARTICLES FROM <kw-var>' + startDate  + '</kw-var> TO <kw-var>' +
        endDate + '</kw-var> WITH SEARCH TERM <kw-var>' + kw.toUpperCase() + '</kw-var>.';

    let text = res.text;
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, 'text/xml');
    const items = doc.querySelectorAll("item");

    let max = (items.length > 8) ? 8 : items.length;
    for (var i = 0; i < max; i++) {
        let el = items[i],
            title = el.querySelector("title").innerHTML,
            date = el.querySelector("pubDate").innerHTML.split(', ')[1].split(':')[0],
            date_str = date.substr(0, date.length - 3).toUpperCase();

        let article = document.createElement('article'),
            div = document.createElement('div'),
            textdata = document.createElement('textdata'),
            h3 = document.createElement('h3'),
            src = document.createElement('src'),
            h2 = document.createElement('h2'),
            a = document.createElement('a'),
            h4 = document.createElement('h4');

        div.setAttribute('class', 'text-bg');
        article.appendChild(div);
        div.appendChild(textdata);
        textdata.appendChild(h3);
        h3.appendChild(src);
        src.innerHTML = `${el.querySelector("source").innerHTML}`;
        textdata.insertAdjacentHTML('beforeend', `<div id="lilspace"></div>`);
        textdata.appendChild(h2);
        h2.appendChild(a)
        a.setAttribute('href', `${el.querySelector("link").innerHTML}`);
        a.setAttribute('target','_blank');
        a.setAttribute('rel','noopener');
        a.innerText = `${title.substr(0, title.lastIndexOf('-'))}`;
        textdata.insertAdjacentHTML('beforeend', `<div id="lilspace"></div>`);
        textdata.appendChild(h4);
        h4.innerHTML = `${date_str}`;
        rss.appendChild(article);
        div.addEventListener('click', (e) => {
            a.click();
        })
    }
    let nextmax = (items.length > (max + 8)) ? (max + 8) : items.length;
    for (max; max < nextmax; max++) {
        let el = items[max];
        let title = el.querySelector("title").innerHTML,
            date = el.querySelector("pubDate").innerHTML.split(', ')[1].split(':')[0],
            date_str = date.substr(0, date.length - 3).toUpperCase();

        let textArticle = document.createElement('text-article'),
            textdata = document.createElement('textdata'),
            h3 = document.createElement('h3'),
            h4 = document.createElement('h4'),
            src = document.createElement('src'),
            h2 = document.createElement('h2'),
            a = document.createElement('a');

        textArticle.appendChild(textdata);
        textdata.appendChild(h3);
        h3.appendChild(src);
        src.innerHTML = `${el.querySelector("source").innerHTML}`;
        textdata.insertAdjacentHTML('beforeend', `<div id="lilspace"></div>`);
        textdata.appendChild(h2);
        h2.appendChild(a);
        a.setAttribute('href', `${el.querySelector("link").innerHTML}`);
        a.setAttribute('target','_blank');
        a.setAttribute('rel','noopener');
        a.innerText = `${title.substr(0, title.lastIndexOf('-'))}`;
        textdata.insertAdjacentHTML('beforeend', `<div id="lilspace"></div>`);
        textdata.appendChild(h4);
        h4.innerHTML = `${date_str}`;
        rss.appendChild(textArticle);
        textArticle.addEventListener('click', (e) => {
            a.click();
        });
    }
    socket.emit('newsImgReq', { url: url, count: max });
});

socket.on('newsImgRes', (obj) => {
    let id_ary = obj.ids;
    let link_ary = obj.links;
    setTimeout(function() {
        let articles = document.getElementsByTagName('article');
        let length = (id_ary.length >= link_ary.length) ? id_ary.length : link_ary.length;
        for (var i = 0; i < length; i++) {
            let index = id_ary[i];
            let style = articles[index].style;
            style.backgroundImage = `url(${link_ary[i]})`;
            style.backgroundRepeat = 'no-repeat';
            style.backgroundSize = 'cover';
        }
    }, 100);
});

socket.on('econData', (obj) => {

    const round = (num) => Math.round( num * 10 + Number.EPSILON ) / 10;

    let data = obj.data;
    let CNSUMR = data.CNSUMR_tp, CNSUMR_G = getGPercent(CNSUMR, data.CNSUMR_lp), CNSUMR_arrow = (CNSUMR_G > 0) ? '↑' : '↓',
        SPX = data.SPX_tp, SPX_G = getGPercent(SPX, data.SPX_lp), SPX_arrow = (SPX_G > 0) ? '↑' : '↓';
    let EUR = data.USD2EUR, JPY = data.USD2JPY;
    let NDX = data.NDX_tm, NDX_G = getGPercent(NDX, data.NDX_pm), NDX_arrow = (NDX_G > 0) ? '↑' : '↓',
        BTC = data.BTC_tm, BTC_G = getGPercent(BTC, data.BTC_pm), BTC_arrow = (BTC_G > 0) ? '↑' : '↓';
    let NDX_G_html = getGHtml(NDX_G, NDX_arrow),
        BTC_G_html = getGHtml(BTC_G, BTC_arrow),
        SPX_G_html = getGHtml(SPX_G, SPX_arrow),
        CNSUMR_G_html = getGHtml(CNSUMR_G, CNSUMR_arrow);
    let CNSUMR_html = checkNA(CNSUMR), SPX_html    = checkNA(SPX),
        EUR_html    = checkNA(EUR),    JPY_html    = checkNA(JPY),
        NDX_html    = checkNA(NDX),    BTC_html    = checkNA(BTC);
    function checkNA(input) {
        return (input === 'N/A') ? `<na>${input}</na>` : input;
    }
    function getGPercent(tp, lp) {
        return round(((tp - lp) / lp) * 100);
    }
    function getGHtml(G, arrow) {
        if (!G) { return `` }
        return (arrow === '↑') ? `<gn>${G}% ${arrow}</gn>` : `<rd>${G}% ${arrow}</rd>`;
    }
    var htmlStr =
        `<div class="marquee">
        <datacard class="marquee-el">
            <datatitle>Consumer Sentiment</datatitle><br>
            <symbol>Uni of Michigan</symbol><br>
            <number>${CNSUMR_html}</number>   <growth>${CNSUMR_G_html}</growth>
        </datacard>    
        <datacard class="marquee-el">
            <datatitle>Nasdaq Composite</datatitle><br>
            <symbol>NASDAQ</symbol><br>
            <number>${NDX_html}</number>   <growth>${NDX_G_html}</growth>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>S&P 500</datatitle><br>
            <symbol>EARNING GROWTH</symbol><br>
            <number>${SPX_html}</number>   <growth>${SPX_G_html}</growth>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>Bitcoin</datatitle><br>
            <symbol>BTC</symbol><br>
            <number>${BTC_html}</number>   <growth>${BTC_G_html}</growth>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>USD to EUR</datatitle><br>
            <symbol>EXCHANGE RATE</symbol><br>
            <number>${EUR_html}</number>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>USD to JPY</datatitle><br>
            <symbol>EXCHANGE RATE</symbol><br>
            <number>${JPY_html}</number>
        </datacard>
        
        <datacard class="marquee-el">
            <datatitle>Consumer Sentiment</datatitle><br>
            <symbol>Uni of Michigan</symbol><br>
            <number>${CNSUMR_html}</number>   <growth>${CNSUMR_G_html}</growth>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>Nasdaq Composite</datatitle><br>
            <symbol>NASDAQ</symbol><br>
            <number>${NDX_html}</number>   <growth>${NDX_G_html}</growth>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>S&P 500</datatitle><br>
            <symbol>EARNING GROWTH</symbol><br>
            <number>${SPX_html}</number>   <growth>${SPX_G_html}</growth>
        </datacard>
        <datacard class="marquee-el">
            <datatitle>Bitcoin</datatitle><br>
            <symbol>BTC</symbol><br>
            <number>${BTC_html}</number>   <growth>${BTC_G_html}</growth>
        </datacard>
        </div>`;
    metrics.style.opacity = '1.0';
    metrics.innerHTML = htmlStr;
});

socket.on('NDX res', (obj) => {
    let NDX = obj.ary;
});

socket.on('err_fetchReq', (obj) => {
    console.log(obj.error);
});

socket.on('err_newsImgReq', (obj) => {
    console.log(obj.error);
});

const svg = document.getElementById('trendsChart');
svg.addEventListener('mousemove', (e) => {
    let x = e.offsetX;

    let d = getClosestDate (x + 5);
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([280, 5]);

    d3.select('#verticalLine')
        .style("opacity", 0.8)
        .attr("z-index", 3)
        .style("left", (x + 5) + "px");

    let cir_opa = (yScale(d.val) + 75 - window.scrollY) < 58 ? 0.0 : 1.0;

    d3.select('#circle')
        .style("opacity", cir_opa)
        .attr("z-index", 3)
        .style("left", (x + 2) + "px")
        .style("top", (yScale(d.val) + 78 - window.scrollY) + "px");

});
svg.addEventListener('mouseout', (e) => {
    d3.select('#verticalLine')
        .style("opacity", 0)

    d3.select('#circle')
        .style("opacity", 0);
});
svg.addEventListener('click', (e) => {
    let x = e.offsetX;
    let d = getClosestDate (x + 5);
    dateClicked = d.date;
    setStartNEndDate(d.date);
    var kw = (keyword).startsWith('/') ? sug_kw : keyword;
    url = getGNewsUrl(kw);
    socket.emit('fetchReq', { date: dateClicked, startDate: startDate, endDate: endDate, url: url });
});

function getSuggestions(str) {
    socket.emit('sug', { keyword: str });
}

function setStartNEndDate(d) {
    let jsDate = new Date(d);

    let Y = jsDate.getFullYear(),
        M = jsDate.getMonth();
    var lastDay = new Date(Y, M + 1, 0);

    var formatTime = d3.timeFormat("%Y-%m-%d");
    startDate = formatTime(d);
    endDate = formatTime(lastDay);
}

function getGNewsUrl(keyword) {

    keyword.trim();
    keyword.split(' ').join('%');

    return (`https://news.google.com/rss/search?q=${keyword}%20after%3A${startDate}%20before%3A${endDate}&hl=en-US&gl=US&ceid=US%3Aen`);
}

function getClosestDate (x) {
    var date = d3.timeParse("%b %Y");

    const xScale = d3.scaleTime()
        .domain([date('Oct 2009'), date_ary[date_ary.length - 1]])
        .range([0, window.innerWidth]);

    var bisectDate = d3.bisector(function(obj) { return obj.date; }).left;
    var xPos = xScale.invert(x);
    var closestEl = bisectDate(obj, xPos);
    var d0 = (obj[closestEl - 1]) ? obj[closestEl - 1] : obj[closestEl];
    var d1 = obj[closestEl];

    return (xPos - d0.date > d1.date - xPos) ? d1 : d0;
}

function drawNDX(ary) {

    let date = d3.timeParse("%m %Y");
    let now = new Date.now();
    let m = (now.getMonth() + 1).toString();
    let y = (now.getFullYear()).toString();

    const xScale = d3.scaleTime()
        .domain([date('10 2009'), date(`${m} ${y}`)])
        .range([0, window.innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([280, 5]);
}

function draw(time_ary, val_ary) {
    date_ary = [];
    let date = d3.timeParse("%b %Y");
    for (var i = 0; i < time_ary.length; i++) {
        obj[i] = {"date": date(time_ary[i]), "val": val_ary[i]};
        date_ary.push(date(time_ary[i]));
    }
    const svg = d3.select("svg");

    const xScale = d3.scaleTime()
        .domain([date('Oct 2009'), date(time_ary[time_ary.length - 1])])
        .range([0, window.innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([280, 5]);

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.val));

    const area = d3.area()
        .x(d => xScale(d.date))
        .y0(yScale(0))
        .y1(d => yScale(d.val))

    // gradients

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "areaGrad")
        .attr("x1", "0%").attr("x2", "0%")
        .attr("y1", "0%").attr("y2", "100%")

    gradient.append("stop")
        .attr('class', 'start')
        .attr("offset", "0%")
        .attr("stop-color", "#46937A")
        .attr("stop-opacity", 1);

    gradient.append("stop")
        .attr('class', 'end')
        .attr("offset", "100%")
        .attr("stop-color", "#46937A")
        .attr("stop-opacity", 0);

    // draw line and area

    svg.append("path")
        .attr("d", line(obj))
        .attr("stroke", "#3CD6A4")
        .attr("stroke-width", "0.8")
        .attr("fill", "none");

    svg.append("path")
        .attr("d", area(obj))
        .attr("fill", "url(#areaGrad)")
        .attr("opacity", "0.3");

    // draw custom axis
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisRight(yScale)
        .tickSize(window.innerWidth) //width of screen

    const g = svg.append("g").attr("class", "axis");

    d3.select('#chartdiv').append("div")
        .attr("id", "verticalLine")
        .style("position", "absolute")
        .style("z-index", "19")
        .style("width", "0.5px")
        .style("height", "350px")
        .style("top", "59px")
        .style("bottom", "0px")
        .style("left", "0px")
        .style("background", "#3CD6A4")
        .style("opacity", 0);

    d3.select('#verticalLine').append("div")
        .attr("id", "circle")
        .style("position", "fixed")
        .style("opacity", 0);

    g.append("g")
        .attr("id", "xAxis")
        .attr("class", "xAxis")
        .attr("transform", "translate(0, 300)")
        .call(customXAxis);

    g.append("g")
        .attr("id", "yAxis")
        .attr("class", "yAxis")
        .attr("transform", "translate(0, 20)")
        .call(customYAxis);

    function customXAxis(g) {
        g.call(xAxis);
        g.select(".domain").remove();
    }
    function customYAxis(g) {
        g.call(yAxis);
        g.select(".domain").remove();
        g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "#3CD6A4").attr("stroke-dasharray", "2,2").attr("stroke-width", "0.3px");
        g.selectAll(".tick text").attr("x", 10).attr("dy", -4);
    }
}


function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

