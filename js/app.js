(function app (){

    document.getElementById('fileinput').addEventListener('change', handleFileChange, false);

    const model = new Model();
    const panel = new Panel(model);
    console.log(panel)

    document.getElementById('openPanel').addEventListener('click', ()=>panel.show());
    document.getElementById('closePanel').addEventListener('click', ()=>panel.hide());
    document.getElementById('create-annotation').addEventListener('click', ()=>panel.createAnnotation());
    document.getElementById('editor').onmouseup = 
      document.getElementById('editor').onselectionchange = ()=>panel.handleSelection();

    for(let input of document.getElementById('display-options').getElementsByTagName('input'))
        input.addEventListener('click', handleDisplayChange);

    return({panel:panel})
})()

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

function Model(){}

Model.prototype.createAnnotation = function(range, annotation_){
    const annotation = annotation_.renderHTML();
    let contents = range.extractContents();
    annotation.appendChild(contents);
    range.insertNode(annotation);
}

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
    $('section#top-panel').css('display','flex');
    this.shown = true;
}

Panel.prototype.hide = function(){
    $('section#top-panel').css('display','none');
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
    const annotation = (new Annotation()).fromDict(values);
    
    this.model.createAnnotation(this.range,annotation);
}

Panel.prototype.updateAnnotation = function(){}


function Annotation(){
    this.type = '';
    this.certainty = '';
    this.author = '';
    this.value = '';
    this.proposedValue = '';
    this.proposedType = '';
}

Annotation.prototype.fromDict = function(values){
    const {type, certainty, author, value, proposedValue, proposedType} = values;

    this.type = type;
    this.certainty = certainty;
    this.author = author;
    this.value = value;
    this.proposedValue = proposedValue;
    this.proposedType = proposedType;

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

    annotation.setAttribute('class', 'annotation');
    annotation.setAttribute('type', this.type);
    annotation.setAttribute('certainty', this.certainty);
    annotation.setAttribute('author', this.author);
    annotation.setAttribute('value', this.value);
    annotation.setAttribute('proposedValue', this.proposedValue);
    annotation.setAttribute('proposedType', this.proposedType);
    annotation.setAttribute('title',
        `(auth=${this.author}) type : ${this.type} cert=${this.certainty} value=${this.value}`);

    return annotation;
}

// Returns the TEI XML code for such annotation
Annotation.prototype.renderTEI = function(){}


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
    let closingTag=false, writing = false, tagRead, words = 0, page = 1;

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
                words += 1;
                if(closingTag === false && words/102 > page*linesPerPage){
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

