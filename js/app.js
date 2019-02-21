const versions = [
    {
        "url": "",
        "timestamp": "2018-4-1",
        "imprecision": 0,
        "ignorance": 1,
        "credibility": 2,
        "completeness": 0 
    },
    {
        "url": "",
        "timestamp": "2018-6-12",
        "imprecision": 0,
        "ignorance": 3,
        "credibility": 2,
        "completeness": 0
    },
    {
        "url": "",
        "timestamp": "2018-8-14",
        "imprecision": 3,
        "ignorance": 5,
        "credibility": 2,
        "completeness": 0
    },
    {
        "url": "",
        "timestamp": "2018-8-22",
        "imprecision": 3,
        "ignorance": 5,
        "credibility": 9,
        "completeness": 2
    },
    {
        "url": "",
        "timestamp": "2019-1-19",
        "imprecision": 3,
        "ignorance": 6,
        "credibility": 14,
        "completeness": 5
    }
];

function app (){

    document.getElementById('fileinput').addEventListener('change', handleFileChange, false);

    const model = new Model();
    const panel = new Panel(model);
    const timeline = new Timeline();
    timeline.renderTimestamps();

    document.getElementById('openPanel').addEventListener('click', ()=>panel.show());
    document.getElementById('closePanel').addEventListener('click', ()=>panel.hide());
    document.getElementById('create-annotation').addEventListener('click', ()=>panel.createAnnotation());
    document.getElementById('editor').onmouseup = 
      document.getElementById('editor').onselectionchange = ()=>panel.handleSelection();

    document.getElementById('toggle-timeline-details').addEventListener('click', ()=>timeline.toggleDetails())


    for(let input of document.getElementById('display-options').getElementsByTagName('input'))
        input.addEventListener('click', handleDisplayChange);

    return({panel:panel})
}

function handleDisplayChange(evt){ 
    $('section#editor').attr(evt.target.id,evt.target.checked);
}

function handleFileChange(evt){
    readSingleFile(evt).then((xml=>{
        const html = (new TEIreader(xml.content)).parseContents();
        
        $("#toolbar-header span#name").html(xml.name)
        $("div#stats").html(`Total annotations : <span>12 </span> Total contributors : <span>6 </span>
            Place : <span>Ireland </span>Date of creation : <span>None </span>`)
        $('#editor').html(html);
    }));
}

function readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    let f = evt.target.files[0]; 

    if (f) {
        return new Promise((resolve)=>{
            let r = new FileReader();
            r.onload = function(e) { 
                let contents = e.target.result;
                contents = contents.replace(/<!--(.*?)-->/gm,"");
              
                resolve({content:contents, name:f.name});
            }
            r.readAsText(f);
        });
    } else { 
        alert("Failed to load file");
    }
}

function getUserSelection() {
    let text = "", selection;
    let node = null;
    if (window.getSelection) {
        selection = window.getSelection();
        text = selection.toString();
    }else if (document.selection && document.selection.type != "Control"){
        selection = document.selection;
        text = document.selection.createRange().text;
    }


    let range = document.createRange();
    range.setStart(selection.anchorNode,selection.anchorOffset);
    range.setEnd(selection.focusNode,selection.focusOffset);

    return {text:text, range:range};
}

/* Timeline
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * */
function timeScale(domain_, range_){
    const domain = [
        domain_.reduce((a,b)=>a<b?a:b),
        domain_.reduce((a,b)=>a>b?a:b)
    ], range = [
        Math.min(...range_),
        Math.max(...range_)
    ];

    return (t)=>{
        //   24 hrs/day * 60 minutes/hour * 60 seconds/minute * 1000 msecs/second
        const msDomainRange = domain[1]-domain[0];
        const daysDomainRange = Math.floor(msDomainRange/(1000 * 60 * 60  * 24));

        const msTrange = t - domain[0];
        const daysTrange = Math.floor(msTrange/(1000 * 60 * 60  * 24));

        return range[0] + (range[1]*(daysTrange/daysDomainRange));
    }
}

function linearScale(domain_, range_){
    const domain = [
        Math.min(...domain_),
        Math.max(...domain_)
    ], range = [
        Math.min(...range_),
        Math.max(...range_)
    ], domRange = domain[1] - domain[0];

    return (x)=>{
        return range[0] + (range[1]*((x-domain[0])/domRange));
    }
}

function Timeline(){
    this.width = "21cm";
    this.displayDetails = false;
    this.detailsRendered = false;
}

Timeline.prototype.renderTimestamps = function(){
    const timestamps = versions.map(x=>new Date(...x.timestamp.split('-'))),
        firstDate = timestamps.reduce((a,b)=>a<b?a:b),
        lastDate = timestamps.reduce((a,b)=>a>b?a:b),
        xScale = timeScale([firstDate, lastDate],[0,20.8]);

    let element = null, offset = 0;
    for(let timestamp of versions){
        offset = xScale(new Date(...timestamp.timestamp.split('-')));

        element = document.createElement('div');
        element.setAttribute('class','timestamp');
        element.style = `left:${offset}cm`;

        element.addEventListener('mouseenter', (evt)=>this.handleTimestampMouseenter(evt,timestamp));
        element.addEventListener('mouseleave', (evt)=>this.handleTimestampMouseleave(evt,timestamp));

        document.getElementById('time-bar').appendChild(element);
    }
}

Timeline.prototype.renderDetails = function(){
    $('div#time-bar canvas').attr('width', $('div#timeline hr').width());
    $('div#time-bar canvas').attr('height', $('div#timeline hr').height());

    const timestamps = versions.map(x=>new Date(...x.timestamp.split('-'))),
        firstDate = timestamps.reduce((a,b)=>a<b?a:b),
        lastDate = timestamps.reduce((a,b)=>a>b?a:b),
        width = Math.trunc($('div#time-bar canvas').width()+1),
        height = Math.trunc($('div#time-bar canvas').height()-2),
        max = Math.max(...Array.prototype.concat(...versions.map(x=>([
                x.imprecision,
                x.credibility,
                x.ignorance,
                x.completeness
            ])))),
        yScale = linearScale([0,max],[0,height]),
        xScale = timeScale([firstDate, lastDate],[0,width]),
        canvasCtx = $('div#time-bar canvas')[0].getContext('2d');

    const renderVersions = (uncertainty, color)=>{
        canvasCtx.beginPath();
        canvasCtx.moveTo(0,height);

        for(let d of versions){
            canvasCtx.lineTo(xScale(new Date(...d.timestamp.split('-'))),height-yScale(d[uncertainty]));
        }

        const last = versions[versions.length-1];
        canvasCtx.lineTo(xScale(new Date(...last.timestamp.split('-'))),height);
        canvasCtx.lineTo(0,height);

        canvasCtx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.07)`;
        canvasCtx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;

        canvasCtx.fill();
        canvasCtx.stroke();
    }

    renderVersions('imprecision',[148,15,137]);
    renderVersions('credibility',[218,136,21]);
    renderVersions('ignorance',[23,85,141]);
    renderVersions('completeness',[174,210,21]);
}

Timeline.prototype.showDetails = function(){
    document.getElementById('toggle-timeline-details').innerText = "( Hide details )";
    $('body').toggleClass('timelineExpanded');
    if(this.detailsRendered === false){
        this.renderDetails();
        this.detailsRendered = true;
    }
}

Timeline.prototype.hideDetails = function(){
    document.getElementById('toggle-timeline-details').innerText = "( Show details )";
    $('body').toggleClass('timelineExpanded')
}

Timeline.prototype.toggleDetails = function(){
    this.displayDetails = !this.displayDetails;
    if(this.displayDetails === true)
        this.showDetails();
    else
        this.hideDetails();
}

Timeline.prototype.handleTimestampMouseenter = function(evt,timestamp){
    const popup = document.getElementById('popup');
    popup.innerHTML=`Timestamp : ${timestamp.timestamp}<br>
      Author : _@email.com<br>
      <span class="imprecision">Imprecision uncertainty tags</span> : ${timestamp.imprecision}<br>
      <span class="ignorance">Ignorance uncertainty tags</span> : ${timestamp.ignorance}<br>
      <span class="credibility">Credibility uncertainty tags</span> : ${timestamp.credibility}<br>
      <span class="incompletness">Completeness uncertainty tags</span> : ${timestamp.completeness}
    `;
    popup.style.left = evt.target.style.left;
    popup.style.display="block";
}

Timeline.prototype.handleTimestampMouseleave = function(evt){
    document.getElementById('popup').style.display="none";
}

/* Model
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * */

function Model(){}

Model.prototype.createAnnotation = function(range, annotation_){
    const annotation = annotation_.renderHTML();
    let contents = range.extractContents();
    annotation.appendChild(contents);
    range.insertNode(annotation);
    $('body').toggleClass('topPanelDisplayed');
}

/* Panel
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * */

function Panel(model_){
    this.annotation = new Annotation();
    this.shown = false;
    this.range = document.createRange();
    this.text = '';
    this.model = model_
}

Panel.prototype.changeAnnotation = function(annotation_){
    this.annotation = annotation_;
}

Panel.prototype.show = function(){
    $('body').toggleClass('topPanelDisplayed');
    this.shown = true;
}

Panel.prototype.hide = function(){
    $('body').toggleClass('topPanelDisplayed');
    this.shown = false;
    this.range = document.createRange();
    Array.from($("#top-panel input"), x=>x).map(i=>i.value = '');
}

Panel.prototype.handleSelection = function(evt){
    const selection = getUserSelection();
    if(selection.range.collapsed === false){
        $('section#top-panel #references').val(selection.text);
        this.range = selection.range;
        this.show();
    }
}

Panel.prototype.createAnnotation = function(){
    const values = {};
    Array.from($("#top-panel input"), x=>x).map(i=>values[i.id]=i.value);
    Array.from($("#top-panel select"), x=>x).map(i=>values[i.id]=i.value);
    const annotation = (new Annotation()).fromDict(values);
    
    this.model.createAnnotation(this.range,annotation);
}

Panel.prototype.updateAnnotation = function(){}

/* Annotation
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * */

function Annotation(){
    this.locus = '';
    this.cert = '';
    this.author = '';
    this.value = '';
    this.proposedValue = '';
    this.source = '';
}

Annotation.prototype.fromDict = function(values){
    const {locus, cert, author, value, proposedValue, source} = values;

    this.locus = locus;
    this.cert = cert;
    this.author = author;
    this.value = value;
    this.proposedValue = proposedValue;
    this.source = source;

    return this;
}

Annotation.prototype.fromHTMLelement = function(){
    return this;
}

Annotation.prototype.fromTEIelement = function(){
    return this;
}

Annotation.prototype.update = function(_val){

}

// Returns the html for such Annotation
Annotation.prototype.renderHTML = function(){
    let attr;
    let annotation = document.createElement('span');

    annotation.setAttribute('class', 'uncertainty');
    annotation.setAttribute('locus', this.locus);
    annotation.setAttribute('cert', this.cert);
    annotation.setAttribute('author', this.author);
    annotation.setAttribute('value', this.value);
    annotation.setAttribute('proposedValue', this.proposedValue);
    annotation.setAttribute('source', this.source);
    annotation.setAttribute('title',
        `(auth=${this.author}) locus : ${this.locus} source={this.source} cert=${this.cert} value=${this.value}`);

    return annotation;
}

// Returns the TEI XML code for such annotation
Annotation.prototype.renderTEI = function(){}

/* TEIreader
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * */

function TEIreader(doc) {
    this.doc = doc;
}

TEIreader.prototype.readTag = function readTag(i_){
    const doc = this.doc;
    let tag = "", tagClass = "", readingClass = true;
    
    let i=i_+1
    for(; i<doc.length; i++){
        if(" />".includes(doc[i])){
            if(readingClass === true){
                tag = `<span class="teiElement ${tagClass}" `;
                readingClass = false;
            }
            if(doc[i] == "/" && doc[i+1] == ">"){
                tag += "></span>";
                i += 1;
                break;
            }
            if(doc[i] == ">"){
                tag += ">";
                break;
            }
        }else{
            if(readingClass === true)
                tagClass += doc[i]
            else
                tag += doc[i];
        }
    }

    return({tag:tag, i:i});
}

TEIreader.prototype.readCDATATag = function readCDATATag(i_){
    const doc = this.doc;

    let tag = "", 
        tagClass = "", 
        readingClass = false,
        tagRead = false,
        content = "";
    
    let i=i_+1
    for(; i<doc.length; i++){
        if(readingClass === true){
            if(doc[i] == '>'){
                tagRead = true;
                readingClass = false;
            }else{
                tagClass += doc[i]
            }
        }else{
            if (doc[i] == '<'){
                if(tagRead === false)
                    readingClass = true;
                if(tagRead === true)
                    break;
            }else if(tagRead === true){
                content += doc[i];
            }
        }
    }
    tag = `<del>${content}</del>`;
    return({tag:tag, i:i+11});
}

TEIreader.prototype.parseContents = function parseContents(){
    const doc = this.doc;

    const linesPerPage = 36;
    let closingTag=false, writing = false, tagRead, letters = 0, page = 1;

    let tag = "", content = '<page size="A4">';

    for(let i=0; i<doc.length; i++){
        if(doc[i] == "<"){
            if("?".includes(doc[i+1]) && writing == true)
                content += "<";
            else{
                tag = "";
                if(doc[i+1] == "/"){
                    closingTag = true;
                    i += 1;
                }else if([0,1,2,3,4,5,6,7,8].map(x=>doc[i+x]).join('') == "<![CDATA["){
                    tagRead = this.readCDATATag(i);
                    i = tagRead.i;
                    if(writing === true)
                        content += tagRead.tag;
                }else{
                    tagRead = this.readTag(i);
                    i = tagRead.i;
                    if(writing === true)
                        content += tagRead.tag;
                }
            }
        }else if(doc[i] == ">" && closingTag === true){
            closingTag = false;
            if(tag.includes("teiHeader"))
                writing = true;
            else if (writing === true)
                content += `</span>`;
        }else {
            if(closingTag === true){
                tag += doc[i];
            }
            else if(writing === true){
                if(closingTag === false)
                    letters += 1;
                if(closingTag === false && letters/102 > page*linesPerPage){
                    page +=1;
                    content += '</page><page size="A4">';
                }
                content += doc[i]
            }
        }
    }

    content += '</page>';
    return content;
}

app();
