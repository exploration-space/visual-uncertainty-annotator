from apiclient import discovery
from httplib2 import Http
from oauth2client import file, client, tools
from apiclient.http import MediaIoBaseDownload
import io

SCOPES = 'https://www.googleapis.com/auth/drive.readonly'
store = file.Storage('storage.json')

def retrieveFileId(filename):
    creds = store.get()
    if not creds or creds.invalid:
        flow = client.flow_from_clientsecrets('../credentials.json', SCOPES)
        creds = tools.run_flow(flow, store)
    DRIVE = discovery.build('drive', 'v3', http=creds.authorize(Http()))
    results = DRIVE.files().list( \
            pageSize=10, q=f"'1-YPlVrQyc70pQnGx45Kvx72ZJrq7_vTg' in parents and name = '{filename}'", \
            supportsTeamDrives=True, includeTeamDriveItems=True, \
            teamDriveId="0AL7QcAG9h5mgUk9PVA", corpora="teamDrive").execute()
    items = results.get('files', [])

    retrieved = ({"retrieved":False, "filename":filename, "id":""})
    if items:
        retrieved = ({"retrieved":True,"filename":items[0]['name'],"id":items[0]['id']})

    return retrieved

def retrieveFileContents(fileid):
    creds = store.get()
    if not creds or creds.invalid:
        flow = client.flow_from_clientsecrets('../../credentials.json', SCOPES)
        creds = tools.run_flow(flow, store)
    DRIVE = discovery.build('drive', 'v3', http=creds.authorize(Http()))

    request = DRIVE.files().get_media(fileId=fileid)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
        print("Download %d%%." % int(status.progress() * 100))

    contents = fh.getvalue()
    fh.close()

    return(contents)
