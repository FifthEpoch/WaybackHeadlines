const googleTrends = require('google-trends-api');
const fetch = require("node-fetch");

var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

http.listen(process.env.PORT || 8080, () => {
    console.log('listening on port 8080');
});

const START_DATE = new Date('2010-01-01');
const END_DATE = new Date(Date.now());

const alphaKey = 'ZY85DCAYW0T9U52G';
const quandl_01 = 'myXDxn1BXpinG2YmVzer';
const quandl_02 = 'JtH74no_BhLzcPoJCtG6';
const quandl_03 = 'omwUKrptw5kA64rqgNys';
const quandl_04 = 'FSoWe8SecYxpbyMAVx8G';
const quandl_05 = '4XQXjDDC2-yx5z-3dXJ3';
const quandl_06 = 'mDwEsVLU7kjrv7nwvUMT';

var pub_dir = __dirname + '/public';
app.use(express.static(pub_dir));
app.use('/style', express.static(pub_dir + '/css'));
app.use('/script', express.static(pub_dir + '/js'));
app.get('/', function (req, res) {
    res.sendFile(pub_dir + '/main.html');
});

io.on('connection', (socket) => {

    let privacy = ['privacy', 'how to protect your privacy online', 'online privacy laws',
        'EARN IT Act', 'personal data', 'internet censorship',
        'General Data Protection Regulation', 'Virtual Private Network', 'Great Firewall',
        'security hacker', 'cyberwarfare', 'surveillance capitalism'];

    socket.emit('privacy', { "ary" : privacy });
    dailyTrends();
    interestOverTime('surveillance capitalism');

    socket.on('search', (keyword) => {
        interestOverTime(keyword);
    });

    socket.on('relatedSearch', (keyword) => {
        relatedTopics(keyword);
    });

    socket.on('sug', (obj) => {
        googleTrends.autoComplete({ keyword: obj.keyword })
            .then(function(results) {
                let data = JSON.parse(results);
                data = data.default.topics;
                socket.emit('sugRes', { res: data });
            })
            .catch(function(err) {
                socket.emit('sugErr', { error: err });
            })
    });

    socket.on('fetchReq', (obj) => {
        fetchRSS(obj.url);
        fetchStockData(obj.startDate, obj.endDate);
    });

    socket.on('newsImgReq', (obj) => {
        fetchImage(obj.url, obj.count);
    });

    function interestOverTime(keyword, start=START_DATE, end=END_DATE) {
        googleTrends.interestOverTime({keyword: keyword, startTime: new Date('2010-01-01')})
            .then((res) => {
                if (!res.startsWith('<')){
                    let data = JSON.parse(res);
                    var time_ary = [],
                        val_ary  = [];
                    for (var i = 0; i < data.default.timelineData.length; i++) {
                        time_ary.push(data.default.timelineData[i].formattedTime);
                        val_ary.push(parseInt(data.default.timelineData[i].value));
                    }
                    socket.emit('search results', { keyword: keyword, time_ary: time_ary, val_ary: val_ary });
                }
            })
            .catch(function(err){
                console.error('There was an error in fetching interestOverTime.\n', err);
                socket.emit('search error', JSON.stringify({err}));
            });
    }

    function dailyTrends() {
        googleTrends.dailyTrends({ geo: 'US' })
            .then((res) => {
                let data = JSON.parse(res);
                let trending = [];
                let ary = data['default']['trendingSearchesDays'][0]['trendingSearches'];
                for (var i = 0; i < ary.length; i++) {
                    trending.push(data['default']['trendingSearchesDays'][0]['trendingSearches'][i]['title']['query']);
                }
                socket.emit('dailyTrends', { "ary" : trending });
            })
            .catch((err) => {
                console.error('There was an error in fetching realTimeTrends.\n', err);
                socket.emit('dailyTrends error', JSON.stringify({err}));
            });
    }

    function relatedTopics(keyword) {
        googleTrends.relatedTopics({ keyword: keyword })
            .then((res) => {
                let data = JSON.parse(res);
                let related = [];
                let ary = data['default']['rankedList'][0]['rankedKeyword'];
                for (var i = 0; i < ary.length; i++) {
                    related.push(data['default']['rankedList'][0]['rankedKeyword'][i]['topic']['title']);
                }
                socket.emit('relatedTopics res', { "ary" : related });
            })
            .catch((err) => {
                socket.emit('relatedTopics error', JSON.stringify({err}));
            });
    }

    function fetchRSS(url) {
        fetch(url).then(res => res.text())
            .then(text => {
                socket.emit('fetchRes', { text: text });
            })
            .catch (function(err) {
                socket.emit('err_fetchReq', { text: err.toString()} );
            });
    }

    function fetchStockData(startDate, endDate) {

        let dataPacket = {};

        let parts = startDate.split('-');
        let Y = parseInt(parts[0]), M = parseInt(parts[1]);

        let pm_start, pm_end;
        if (M !== 1) {
            var d = (new Date(Y, M - 1, 0)).getDate();
            let base = Y.toString().concat(`-${(M - 1)}`)
            pm_start = base.concat(`-01`);
            pm_end = base.concat(`-${d}`);
        } else {
            let base = (Y - 1).toString();
            pm_start = base.concat('-12-01');
            pm_end = base.concat('-12-31');
        }

        // quarterly end date M = 3, 6, 9, 12
        let qly_end = getQlyEnd(M, endDate);
        let qly_end_parts = qly_end.split('-');
        let new_M = (qly_end_parts[1] > 3) ? (qly_end_parts[1] - 3) : (9 + qly_end_parts[1]);
        let new_Y = (qly_end_parts[1] > 3) ? qly_end_parts[0] : qly_end_parts[0] - 1;
        let new_ED = (new Date(new_Y, new_M, 0)).getDate().toString().padStart(2,'0');
        let new_ED_str = `${new_Y.toString()}-${new_M.toString().padStart(2,'0')}-${new_ED}`;
        let last_qly_end = getQlyEnd(new_M, new_ED_str);

        function getQlyEnd(M, endDate) {
            if (M % 3 === 0) {
                return endDate;
            } else if (M === 1) {
                return (Y-1).toString().concat('-12-31');
            } else {
                var nearestQE = 12;
                while (Math.abs(nearestQE - M) > 1) {
                    nearestQE -= 3;
                }
                let Q_end = new Date(Y, nearestQE, 0);
                let Q_m = (Q_end.getMonth() + 1).toString().padStart(2, '0'),
                    Q_d = Q_end.getDate().toString().padStart(2, '0');
                return Y.toString().concat(`-${Q_m}-${Q_d}`);
            }
        }

        var count = 0;

        let USD2EUR = `https://www.alphavantage.co/query?function=FX_MONTHLY&from_symbol=USD&to_symbol=EUR&apikey=${alphaKey}`;
        let USD2JPY = `https://www.alphavantage.co/query?function=FX_MONTHLY&from_symbol=USD&to_symbol=JPY&apikey=${alphaKey}`;

        let NDX_pm = `https://www.quandl.com/api/v3/datasets/NASDAQOMX/COMP?start_date=${pm_start}&end_date=${pm_end}&column_index=1&api_key=${quandl_01}`;
        let NDX_tm = `https://www.quandl.com/api/v3/datasets/NASDAQOMX/COMP?start_date=${startDate}&end_date=${endDate}&column_index=1&api_key=${quandl_02}`;

        let BTC_pm = `https://www.quandl.com/api/v3/datasets/BCHARTS/BITSTAMPUSD?start_date=${pm_start}&end_date=${pm_end}&api_key=${quandl_03}`;
        let BTC_tm   = `https://www.quandl.com/api/v3/datasets/BCHARTS/BITSTAMPUSD?start_date=${startDate}&end_date=${endDate}&api_key=${quandl_04}`;

        let SPX_monthly = `https://www.quandl.com/api/v3/datasets/MULTPL/SP500_REAL_EARNINGS_GROWTH_QUARTER?start_date=${last_qly_end}&end_date=${qly_end}&api_key=${quandl_05}`;
        let cnsmr_sntmnt = `https://www.quandl.com/api/v3/datasets/UMICH/SOC1?start_date=${pm_end}&end_date=${endDate}&api_key=${quandl_06}`;


        socket.on('NDX', () => {
            let NDX = `https://www.quandl.com/api/v3/datasets/NASDAQOMX/COMP?start_date=2009-10-01&column_index=1&api_key=${quandl_01}`;
            fetchNDX(NDX);

            function fetchNDX(url) {
                fetch(url).then(res => res.text())
                    .then((text) => {
                        let parsed = JSON.parse(text);
                        let data = parsed.dataset.data;
                        let NDX = [];
                        for(var i = 0; i < data.length; i += 23) {
                            NDX.push({ date: data[i][0], val: data[i][1] });
                        }
                        NDX[NDX.length -1] = { date: parsed.dataset.end_date, val: NDX[NDX.length -1].val };
                        socket.emit('NDX res', { ary : NDX });
                    })
                    .catch((err) => {
                        // emit error
                    });
            }
        });

        fetchCurrencyData(USD2EUR, 'USD2EUR');
        fetchCurrencyData(USD2JPY, 'USD2JPY');

        fetchMonthData(NDX_pm, 'NDX_pm', 1);
        fetchMonthData(NDX_tm, 'NDX_tm', 1);
        fetchMonthData(BTC_pm, 'BTC_pm', 7);
        fetchMonthData(BTC_tm, 'BTC_tm', 7);

        fetchDayData(SPX_monthly, 'SPX');
        fetchDayData(cnsmr_sntmnt, 'CNSUMR');


        function fetchCurrencyData(url, dataTitle) {
            fetch(url).then(res => res.text())
                .then(text => {
                    let parsed = JSON.parse(text);
                    let safeDate = endDate;
                    if (!(parsed["Time Series FX (Monthly)"][safeDate])) {
                        let base = `${parts[0]}-${parts[1]}-`;
                        for (var n = 31; n > 23; n--) {
                            let temp = base.concat(n.toString());
                            if (parsed["Time Series FX (Monthly)"][temp]) {
                                safeDate = temp;
                                break;
                            }
                        }
                        if (n === 24) { throw "no data"; }
                    }
                    let data = parsed["Time Series FX (Monthly)"][safeDate]["4. close"];
                    dataPacket[dataTitle] = round(data);
                    count++;
                    checkCount();
                })
                .catch((err) => {
                    dataPacket[dataTitle] = 'N/A';
                    count++;
                    checkCount();
                });
        }

        function fetchMonthData(url, dataTitle, n) {
            fetch(url).then(res => res.text())
                .then(text => {
                    let parsed = JSON.parse(text);
                    let data = parsed.dataset.data;
                    let average = (data[0][n] + data[data.length - 1][n]) / 2;

                    dataPacket[dataTitle] = round(average);
                    count++;
                    checkCount();
                }).catch((err) => {
                    dataPacket[dataTitle] = 'N/A';
                    count++;
                    checkCount();
            });
        }

        function fetchDayData(url, dataTitle) {
            fetch(url).then(res => res.text())
                .then(text => {
                    let parsed = JSON.parse(text);
                    let data_tp = parsed.dataset.data[0][1],
                        data_lp = parsed.dataset.data[1][1];

                    dataPacket[`${dataTitle}_tp`] = round(data_tp);
                    dataPacket[`${dataTitle}_lp`] = round(data_lp);
                    count++; count++;
                    checkCount();
                })
                .catch((err) => {
                    dataPacket[`${dataTitle}_tp`] = 'N/A';
                    dataPacket[`${dataTitle}_lp`] = 'N/A';
                    count++; count++;
                    checkCount();
                });
        }

        function checkCount() {
            if (count >= 10) {
                socket.emit('econData', { data: dataPacket });
            }
        }
        const round = (num) => Math.round( num * 100 + Number.EPSILON ) / 100;
    }

    function fetchImage(url, count) {
        let topHalf = url.substr(0, url.indexOf("/rss"));
        let bottomHalf = url.substr(url.indexOf("/rss") + 4);
        let GNewsUrl = topHalf.concat(bottomHalf);

        fetch(GNewsUrl).then(res => res.text())
            .then(text => {
                let splitOn_1x = text.split("1x, ");
                if (splitOn_1x.length !== 0) {
                    let links = [],
                        ids = [];
                    var i = 0;
                    while(i < count) {
                        let splitOn_2x = splitOn_1x[i].split(' 2x"');
                        var j = 0;
                        while(j < splitOn_2x.length) {

                            if (splitOn_2x[j].length < 1000 && splitOn_2x[j].length !== 0) {
                                let str = splitOn_2x[j].substr(splitOn_2x[j].indexOf('\/') + 2);
                                str = ('http://').concat(str);
                                links.push(str);
                            } else {
                                let temp = splitOn_2x[j].split('id="i')[1];
                                let int = parseInt(temp);
                                if (int % 2 === 0) {
                                    let id = ((int - 2) / 2) - 1;
                                    ids.push(id);
                                }
                            }
                            j++;
                        }
                        i++;
                    }
                    socket.emit('newsImgRes', { ids: ids, links: links })
                }
            })
            .catch((err) => {
                // emit error
            });
    }
});
