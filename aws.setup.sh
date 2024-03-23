[ ! -f aws.credentials.json ] && cp aws.credentials.sample.json aws.credentials.json
nano aws.credentials.json || notepad.exe aws.credentials.json || open -a TextEdit aws.credentials.json || echo "Text editor not found. Edit `aws.credentials.json` and run `setup.sh` again." 
cp aws.credentials.json webapp/src/aws.credentials.json
cp aws.credentials.json mobileapp/aws.credentials.json
