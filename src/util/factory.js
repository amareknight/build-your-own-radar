const d3 = require('d3');
const Tabletop = require('tabletop');
const XLSX = require('xlsx');
const _ = {
    map: require('lodash/map'),
    uniqBy: require('lodash/uniqBy'),
    capitalize: require('lodash/capitalize'),
    each: require('lodash/each')
};

const InputSanitizer = require('./inputSanitizer');
const Radar = require('../models/radar');
const Quadrant = require('../models/quadrant');
const Ring = require('../models/ring');
const Blip = require('../models/blip');
const GraphingRadar = require('../graphing/radar');
const MalformedDataError = require('../exceptions/malformedDataError');
const SheetNotFoundError = require('../exceptions/sheetNotFoundError');
const ContentValidator = require('./contentValidator');
const Sheet = require('./sheet');
const ExceptionMessages = require('./exceptionMessages');


const LocalSheet = function (filename, workbook) {
    var self = {};

    self.build = function () {

        createRadar();

        function displayErrorMessage(exception) {
            d3.selectAll(".loading").remove();
            var message = 'Oops! It seems like there are some problems with loading your data. ';

            if (exception instanceof MalformedDataError) {
                message = message.concat(exception.message);
            } else if (exception instanceof SheetNotFoundError) {
                message = exception.message;
            } else {
                console.error(exception);
            }

            message = message.concat('<br/>', 'Please check <a href="https://info.thoughtworks.com/visualize-your-tech-strategy-guide.html#faq">FAQs</a> for possible solutions.');

            d3.select('body')
                .append('div')
                .attr('class', 'error-container')
                .append('div')
                .attr('class', 'error-container__message')
                .append('p')
                .html(message);
        }

        function createRadar(__) {

            try {
                var sheetName = workbook.SheetNames[0];
                var sheet = workbook.Sheets[sheetName];
                var headers = [];
                var range = XLSX.utils.decode_range(sheet['!ref']);
                var C, R = range.s.r; /* start in the first row */
                /* walk every column in the range */
                for(C = range.s.c; C <= range.e.c; ++C) {
                    var cell = sheet[XLSX.utils.encode_cell({c:C, r:R})] /* find the cell in the first row */

                    var hdr = "UNKNOWN " + C; // <-- replace with your desired default 
                    if(cell && cell.t) hdr = XLSX.utils.format_cell(cell);

                    headers.push(hdr);
                }
                var contentValidator = new ContentValidator(headers);
                contentValidator.verifyContent();
                contentValidator.verifyHeaders();

                var all = XLSX.utils.sheet_to_json(sheet);
                var blips = _.map(all, new InputSanitizer().sanitize);

                document.title = filename;
                d3.selectAll(".loading").remove();
                var rings = _.map(_.uniqBy(blips, 'ring'), 'ring');
                var ringMap = {};
                var maxRings = 4;

                _.each(rings, function (ringName, i) {
                    if (i == maxRings) {
                        throw new MalformedDataError(ExceptionMessages.TOO_MANY_RINGS);
                    }
                    ringMap[ringName] = new Ring(ringName, i);
                });
                var quadrants = {};
                _.each(blips, function (blip) {
                    if (!quadrants[blip.quadrant]) {
                        quadrants[blip.quadrant] = new Quadrant(_.capitalize(blip.quadrant));
                    }
                    quadrants[blip.quadrant].add(new Blip(blip.name, ringMap[blip.ring], blip.isNew.toLowerCase() === 'true', blip.topic, blip.description))
                });
                var radar = new Radar();
                _.each(quadrants, function (quadrant) {
                    radar.addQuadrant(quadrant)
                });

                var size = (window.innerHeight - 133) < 620 ? 620 : window.innerHeight - 133;

                new GraphingRadar(size, radar).init().plot();

            } catch (exception) {
                displayErrorMessage(exception);
            }
        }
    };

    self.init = function () {

        d3.select('body div.input-sheet').remove();

        var content = d3.select('body')
            .append('div')
            .attr('class', 'loading')
            .append('div')
            .attr('class', 'input-sheet');

        set_document_title();

        plotLogo(content);

        var bannerText = '<h1>Building your radar...</h1><p>Your Technology Radar will be available in just a few seconds</p>';
        plotBanner(content, bannerText);
        plotFooter(content);

        return self;
    };

    return self;
};

const LocalSheetInput = function () {
    var self = {};

    self.build = function () {
        
        var content = d3.select('body')
        .append('div')
        .attr('class', 'input-sheet');

        set_document_title();

        plotLogo(content);

        var bannerText = '<h1>Build your own radar</h1><p>Once you\'ve <a href ="https://info.thoughtworks.com/visualize-your-tech-strategy.html">created your Radar</a>, you can use this service' +
            ' to generate an <br />interactive version of your Technology Radar. Not sure how? <a href ="https://info.thoughtworks.com/visualize-your-tech-strategy-guide.html">Read this first.</a></p>';

        plotBanner(content, bannerText);

        plotForm(content);

        plotFooter(content);
    };

    return self;
};

function set_document_title() {
    document.title = "Build your own Radar";
}

function plotLogo(content) {
    content.append('div')
        .attr('class', 'input-sheet__logo')
        .html('<a href="https://www.thoughtworks.com"><img src="/images/tw-logo.png" / ></a>');
}

function plotFooter(content) {
    content
        .append('div')
        .attr('id', 'footer')
        .append('div')
        .attr('class', 'footer-content')
        .append('p')
        .html('Powered by <a href="https://www.thoughtworks.com"> ThoughtWorks</a>. '
        + 'By using this service you agree to <a href="https://info.thoughtworks.com/visualize-your-tech-strategy-terms-of-service.html">ThoughtWorks\' terms of use</a>. '
        + 'You also agree to our <a href="https://www.thoughtworks.com/privacy-policy">privacy policy</a>, which describes how we will gather, use and protect any personal data contained in your public Google Sheet. '
        + 'This software is <a href="https://github.com/thoughtworks/build-your-own-radar">open source</a> and available for download and self-hosting.');

}

function plotBanner(content, text) {
    content.append('div')
        .attr('class', 'input-sheet__banner')
        .html(text);

}

/* for handleDrop and handleFile */
function fixdata(data) {
  var o = "", l = 0, w = 10240;
  for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
  o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
  return o;
}
function handleDragover() {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    d3.event.dataTransfer.dropEffect = 'copy';
}
/* 
Both handleDrop and handleFile use FileReader and 
readAsArrayBuffer to read local Excel file.
Ref: https://github.com/SheetJS/js-xlsx
*/
function handleDrop() {
  d3.event.stopPropagation();
  d3.event.preventDefault();
  var files = d3.event.dataTransfer.files;
  var i,f;
  for (i = 0; i != files.length; ++i) {
    f = files[i];
    var reader = new FileReader();
    var name = f.name;
    reader.onload = function(e) {
      var data = e.target.result;

      var workbook;
      var arr = fixdata(data);
      workbook = XLSX.read(btoa(arr), {type: 'base64'});

      var sheet = LocalSheet(name, workbook);
      sheet.init().build();
    };
    reader.readAsArrayBuffer(f);
  }
  return false;
}
function handleFile() {
  d3.event.stopPropagation();
  d3.event.preventDefault();
  var files = d3.event.target.files;
  var i,f;
  for (i = 0; i != files.length; ++i) {
    f = files[i];
    var reader = new FileReader();
    var name = f.name;
    reader.onload = function(e) {
      var data = e.target.result;

      var workbook;
      var arr = fixdata(data);
      workbook = XLSX.read(btoa(arr), {type: 'base64'});

      var sheet = LocalSheet(name, workbook);
      sheet.init().build();
    };
    reader.readAsArrayBuffer(f);
  }
  return false;
}

function plotForm(content) {
    content.append('div')
        .attr('class', 'input-sheet__form');

    var localForm = content.select('.input-sheet__form').append('form')
        .attr('method', 'get');
    /* drag & drop area */
    localForm.append('div')
             .attr('id', 'drop-area')
             .on('dragenter', handleDragover)
             .on('dragover', handleDragover)
             .on('drop', handleDrop)
             .append('p')
             .text('Click to choose or Drag & Drop Excel file here');
    /* file picker */
    localForm.select('#drop-area')
             .append('input')
             .attr('type', 'file')
             .attr('name', 'localSheet')
             .attr('id', 'xlsxfile')
             .on('change', handleFile);

    localForm.append('p')
             .html("You can download an input sample <a href='https://docs.google.com/spreadsheets/d/1YXkrgV7Y6zShiPeyw4Y5_19QOfu5I6CyH5sGnbkEyiI/export?format=xlsx&id=1YXkrgV7Y6zShiPeyw4Y5_19QOfu5I6CyH5sGnbkEyiI' target=_blank>here</a>.");
}

module.exports = LocalSheetInput;
