# 🙋 Aleta
Eina per junta i tècnica per gestionar la colla de codi obert.

## Instal·lar l'Aleta a un Amazon Linux 2 nou:
```
sudo yum update -y
sudo yum install git -y
git --version

git clone https://github.com/Huguet57/aleta.git

screen -S sql
sudo yum update -y
sudo yum install -y mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo mysql_secure_installation

cd aleta/sql/
mysql -u root -p < aleta.sql

exit

cd aleta
sh setup.sh

screen -S node

# NODE in normal
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 16
node -e "console.log('Running Node.js ' + process.version)"

cd backend/
npm install

# NODE in sudo
sudo -i
cd ../home/ec2-user/aleta/
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 16
node -e "console.log('Running Node.js ' + process.version)"

# ROUTE 53
echo "Posa la public IP de la instància a Route 53 com a {colla}-api.tenimaleta.com"

# CERTBOT
sudo amazon-linux-extras install epel -y
sudo yum install certbot python2-certbot-apache -y
sudo systemctl stop httpd
sudo certbot certonly --standalone # sudo certbot certonly --webroot -w /var/www/html
sudo sh -c '(crontab -l 2>/dev/null; echo "0 */12 * * * certbot renew --quiet") | crontab -'

# pm2
npm install -g pm2

# SQL mode
SET GLOBAL sql_mode = 'NO_ENGINE_SUBSTITUTION';
```

## Com córrer l'Aleta al teu ordinador?
### Abans de tot
0. Tenir instal·lat git: `https://git-scm.com/downloads` i clonar aquest repositori
1. Instal·lar nodeJS (https://nodejs.org/en/download/)
2. `npm install` a la carpeta arrel i a la carpeta `webapp/`
3. `sh setup.sh` i definir les credencials segons el vostre servidor SQL

### Córrer les diferentes parts de l'Aleta
- (Backend) Des de la carpeta `backend/`, córrer `node main.js`
- (WebApp) Des de la carpeta `webapp/`, córrer `npm start`

### Gestionar la base SQL de la vostra colla
El fitxer `aleta.sql` defineix l'estructura que ha de tenir la base de dades SQL. Si per exemple es té instal·lada l'eina `mysql`, és tan fàcil com executar: `mysql -u root -p < aleta.sql` per crear l'estructura de base de dades. Alternativament, recomanem l'eina `phpmyadmin` per gestionar les bases de dades SQL, ja que és molt intuïtiva i gràfica.

Dins de l'eina `phpmyadmin`, buscarem el botó d'`Importar` i pujarem el fitxer `aleta.sql` per crear la base de dades. Amb l'eina `phpmyadmin`, inseriu els assaigos/comercials/actuacions a la taula `events`.

## Llista de TODOs prioritzats
Llista de totes les funcionalitats i coses que s'estan fent ara mateix: https://trello.com/b/DgPZzSxn/main-todos.

## Suggerències de l'Edu
Document amb funcionalitats a afegir organitzades per urgència: [https://docs.google.com/spreadsheets/d/1g__wQ03HpQet5XgHxmGGpmGjTZyZMm1gQyH7yRNEchc/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1g__wQ03HpQet5XgHxmGGpmGjTZyZMm1gQyH7yRNEchc/edit?usp=sharing)
