[ ! -f db.credentials.json ] && cp db.credentials.sample.json db.credentials.json
vi db.credentials.json || notepad.exe db.credentials.json || open -a TextEdit db.credentials.json || echo "Text editor not found. Edit `db.credentials.json` and run `setup.sh` again." 
cp db.credentials.json webapp/src/db.credentials.json
cp db.credentials.json mobileapp/db.credentials.json
