#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sqlite3, os, sys, unicodedata, mutagen
from mutagen.id3 import ID3

USER = os.environ["HOME"]
MIXXXDB = USER + "/Library/Application Support/Mixxx/mixxxdb.sqlite"
MUSICFOLDER = USER + u"/Music/iTunes/iTunes Music/Music/"

faultyfiles = []

def logFileEvent(file, msg, errorlevel=1):
    global faultyfiles
    pref = '\033[0m'
    suf = '\033[0m'
    if errorlevel == 1:
        pref = '\033[91m'
        faultyfiles.append((file, msg))
    elif errorlevel == 3:
        pref = '\033[92m'
    print pref + file + ": " + msg + suf


try:
    con = sqlite3.connect(MIXXXDB)

    cur = con.cursor()
    cur.execute('SELECT SQLITE_VERSION()')

    data = cur.fetchone()

    print "Connected to Mixxx database, SQLite version: %s" % data

except sqlite3.Error, e:

    print "SQL Error %s:" % e.args[0]
    sys.exit(1)


fileList = []
for root, subFolders, files in os.walk(MUSICFOLDER):
    for file in files:
        if file.endswith(".mp3"):
            fullfile = os.path.join(root,file)
            try:
                audio = ID3(fullfile)
            except mutagen._id3util.ID3NoHeaderError:
                logFileEvent(file, "No ID3 header.")
            try:
                cur = con.cursor()
                cur.execute(u'SELECT id FROM track_locations WHERE location=?', (unicodedata.normalize("NFC", fullfile),) )
                data = cur.fetchone()

                if data:
                    cur.execute('SELECT key FROM library WHERE id=?', (str(data[0]),))
                    data2 = cur.fetchone()
                    if data2 and str(data2[0]) == str(audio["TKEY"]):
                        logFileEvent(file, "Already correct.", 3)
                    else:
                        cur.execute('UPDATE library SET key=? WHERE id=?', (str(audio["TKEY"]),str(data[0])))
                        con.commit()
                        logFileEvent(file, "Updated to " + str(audio["TKEY"]), 2)
                else:
                    logFileEvent(file, "Not found in database.")

            except KeyError:
                logFileEvent(file, "No TKEY tag.")
        else:
            logFileEvent(file, "Not an mp3 file.")

print "Errors found in: " + str(faultyfiles)


if con:
        con.close()
