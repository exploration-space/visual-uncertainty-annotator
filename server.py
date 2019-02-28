from flask import Flask, render_template
import drive

app = Flask(__name__, static_url_path='')

@app.route('/')
def index():
    return render_template('index.html',message='Rendered')

@app.route('/id/<filename>')
def fromDrive(filename):
    filedesc = drive.retrieveFileId(filename)
    result = f'search done : {filedesc["retrieved"]} : {filedesc["filename"]} : {filedesc["id"]}'

    filecont = drive.retrieveFileContents(filedesc["id"])
    # show the user profile for that user
    return render_template('index.html', tei=filecont, teiname=filename)

# run the application
if __name__ == "__main__":  
    app.run(debug=True, host="0.0.0.0")
